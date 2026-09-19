// Artwork search against The Met. A search term applies together with every filter and must
// visibly match each work shown (ADR 0010); an empty term samples every work the filters allow
// from a random offset (ADR 0003). IDs are checked in batches only until the page is full, and
// each page's cursor marks where it stopped, so the next page carries on from there (ADR 0011).

import { type MetClient, SEARCH_WINDOW, WILDCARD } from "@/server/met/client";
import type { MetSearchParams } from "@/server/met/types";
import { type Artist, type Artwork, hasImage } from "@/server/models/artwork";
import { encodeCursor } from "@/server/models/cursor";
import { matchesTerm } from "@/server/models/search-match";
import type { TraceRecorder } from "@/server/trace-recorder";
import { diagnose, type SearchDiagnosis, type SearchFilter } from "./diagnosis";

// Many matches carry no Open Access image, so each batch asks for twice the IDs a page needs.
const OVERFETCH = 2;
// The most batches one page may check before it settles for fewer works.
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
  after: number | null;
};

export type PageInfo = {
  startCursor: string;
  hasNextPage: boolean;
  endCursor: string | null;
};

export type ArtworkResults = ArtworkSearch & {
  total: number;
  items: Artwork[];
  pageInfo: PageInfo;
};

type Page = {
  items: Artwork[];
  checked: number;
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

// Loads batches until the page is full. `checked` counts the IDs the page used up, stopping at the
// last work it kept, so the next page starts exactly where this one ended.
async function fillPage(
  batches: number[][],
  first: number,
  keep: (artwork: Artwork) => boolean,
  dependencies: Dependencies,
  page: Page = { items: [], checked: 0 },
): Promise<Page> {
  const [next, ...rest] = batches;
  if (!next || page.items.length >= first) return page;

  const loaded = await dependencies.loaders.artwork.loadMany(next);
  const kept = loaded.flatMap((artwork, index) =>
    hasImage(artwork) && keep(artwork) ? [{ artwork, position: page.checked + index }] : [],
  );
  const room = first - page.items.length;
  const taken = kept.slice(0, room);
  const full = kept.length >= room;

  return fillPage(rest, first, keep, dependencies, {
    items: [...page.items, ...taken.map(({ artwork }) => artwork)],
    checked: full ? (taken.at(-1)?.position ?? page.checked) + 1 : page.checked + next.length,
  });
}

export async function searchArtworks(
  search: ArtworkSearch,
  dependencies: Dependencies,
): Promise<ArtworkResults> {
  const params = searchParams(search);
  const batch = search.first * OVERFETCH;
  const span = batch * MAX_BATCHES;
  const offset = search.after ?? (search.term ? 0 : await randomOffset(params, span, dependencies));
  const limit = Math.min(span, SEARCH_WINDOW - offset);

  const result = await dependencies.met.search({ ...params, limit, offset }, dependencies.trace);
  const page = await fillPage(
    chunk(result.ids, batch),
    search.first,
    (artwork) => !search.term || matchesTerm(artwork, search.term),
    dependencies,
  );

  const end = offset + page.checked;
  const hasNextPage = page.checked > 0 && end < Math.min(result.total, SEARCH_WINDOW);
  return {
    ...search,
    total: result.total,
    items: page.items,
    pageInfo: {
      startCursor: encodeCursor(offset),
      hasNextPage,
      endCursor: hasNextPage ? encodeCursor(end) : null,
    },
  };
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
