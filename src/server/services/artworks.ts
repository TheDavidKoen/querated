// Artwork search against The Met. A search term applies together with every filter and must
// visibly match each work shown (ADR 0010); an empty term samples every work the filters allow
// from a random offset (ADR 0003). IDs are checked in batches only until the page is full.

import { type MetClient, SEARCH_WINDOW, WILDCARD } from "@/server/met/client";
import type { MetSearchParams } from "@/server/met/types";
import { type Artist, type Artwork, hasImage } from "@/server/models/artwork";
import { matchesTerm } from "@/server/models/search-match";
import type { TraceRecorder } from "@/server/trace-recorder";
import { diagnose, type SearchDiagnosis, type SearchFilter } from "./diagnosis";

// Many matches carry no Open Access image, so each batch asks for twice the IDs a page needs.
const OVERFETCH = 2;
// The most batches a search term may check before the page settles for fewer works.
const MAX_BATCHES = 3;

type Loaded = Artwork | null | Error;

type Dependencies = {
  met: MetClient;
  trace: TraceRecorder;
  loaders: {
    artwork: { loadMany(ids: readonly number[]): Promise<Loaded[]> };
    artistWorkIds: { load(name: string): Promise<number[]> };
  };
};

export type ArtworkSearch = {
  term: string;
  filters: SearchFilter[];
  first: number;
};

export type ArtworkResults = ArtworkSearch & {
  total: number;
  items: Artwork[];
};

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

function searchParams({ term, filters }: ArtworkSearch): Omit<MetSearchParams, "limit"> {
  return {
    q: term || WILDCARD,
    hasImages: true,
    ...Object.assign({}, ...filters.map((filter) => filter.params)),
  };
}

// The Met lists wildcard matches in the same order every time, so an empty search reads from a
// random offset. It costs one count first; v1.1 search only reaches the first 10,000 results.
async function randomOffset(
  params: Omit<MetSearchParams, "limit">,
  span: number,
  { met, trace }: Dependencies,
): Promise<number> {
  const { total } = await met.search({ ...params, limit: 1 }, trace);
  const room = Math.min(total, SEARCH_WINDOW) - span;
  return room > 0 ? Math.floor(Math.random() * room) : 0;
}

async function fillPage(
  batches: number[][],
  first: number,
  keep: (artwork: Artwork) => boolean,
  dependencies: Dependencies,
  found: Artwork[] = [],
): Promise<Artwork[]> {
  const [next, ...rest] = batches;
  if (!next || found.length >= first) return found.slice(0, first);
  const loaded = await dependencies.loaders.artwork.loadMany(next);
  return fillPage(rest, first, keep, dependencies, [
    ...found,
    ...loaded.filter(hasImage).filter(keep),
  ]);
}

export async function searchArtworks(
  search: ArtworkSearch,
  dependencies: Dependencies,
): Promise<ArtworkResults> {
  const params = searchParams(search);
  const batch = search.first * OVERFETCH;
  const offset = search.term ? 0 : await randomOffset(params, batch, dependencies);
  const limit = search.term ? batch * MAX_BATCHES : batch;

  const result = await dependencies.met.search({ ...params, limit, offset }, dependencies.trace);
  const items = await fillPage(
    chunk(result.ids, batch),
    search.first,
    (artwork) => !search.term || matchesTerm(artwork, search.term),
    dependencies,
  );

  return { ...search, total: result.total, items };
}

export async function diagnoseEmpty(
  results: ArtworkResults,
  { met, trace }: Dependencies,
): Promise<SearchDiagnosis | null> {
  if (results.total > 0) return null;
  const base = { ...searchParams({ ...results, filters: [] }), limit: 1 };
  return diagnose(results.filters, async (params) => {
    const { total } = await met.search({ ...base, ...params }, trace);
    return total;
  });
}

export async function otherWorksBy(
  artist: Artist,
  first: number,
  { loaders }: Dependencies,
): Promise<Artwork[]> {
  const ids = (await loaders.artistWorkIds.load(artist.name))
    .filter((id) => String(id) !== artist.sourceArtworkId)
    .slice(0, first * OVERFETCH);
  const works = await loaders.artwork.loadMany(ids);
  return works
    .filter(hasImage)
    .filter((work) => work.artist?.name === artist.name)
    .slice(0, first);
}
