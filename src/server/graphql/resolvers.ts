// Resolvers: the controller layer. They validate arguments before anything reaches The Met, hand
// the work to src/server/services, and translate upstream failures into errors clients may see.

import { GraphQLError } from "graphql";
import {
  DEFAULT_RESULT_COUNT,
  EARLIEST_YEAR,
  latestYear,
  MAX_DEPARTMENT_ID,
  MAX_OTHER_WORKS,
  MAX_RESULT_COUNT,
  OTHER_WORKS_COUNT,
  SEARCH_MAX_LENGTH,
} from "@/lib/contract";
import { MetUnavailableError, SEARCH_WINDOW } from "@/server/met/client";
import type { Artist, Artwork } from "@/server/models/artwork";
import { decodeCursor } from "@/server/models/cursor";
import {
  type ArtworkResults,
  type ArtworkSearch,
  diagnoseEmpty,
  otherWorksBy,
  searchArtworks,
} from "@/server/services/artworks";
import type { SearchFilter } from "@/server/services/diagnosis";
import type { QueratedContext } from "./context";

type ArtworksArgs = {
  search?: string | null;
  departmentId?: number | null;
  from?: number | null;
  to?: number | null;
  highlightsOnly?: boolean | null;
  first?: number | null;
  after?: string | null;
};

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function wholeNumber(
  value: number | null | undefined,
  fallback: number,
  min: number,
  max: number,
  name: string,
): number {
  const number = value ?? fallback;
  if (!Number.isInteger(number) || number < min || number > max) {
    badInput(`${name} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function departmentFilter(args: ArtworksArgs): SearchFilter[] {
  if (args.departmentId == null) return [];
  const departmentId = wholeNumber(args.departmentId, 1, 1, MAX_DEPARTMENT_ID, "departmentId");
  return [{ arguments: ["departmentId"], params: { departmentId } }];
}

function yearFilter(args: ArtworksArgs): SearchFilter[] {
  const named = (["from", "to"] as const).filter((name) => args[name] != null);
  if (named.length === 0) return [];
  const latest = latestYear();
  const dateBegin = wholeNumber(args.from, EARLIEST_YEAR, EARLIEST_YEAR, latest, "from");
  const dateEnd = wholeNumber(args.to, latest, EARLIEST_YEAR, latest, "to");
  if (dateBegin > dateEnd) badInput("from must not be later than to.");
  return [{ arguments: [...named], params: { dateBegin, dateEnd } }];
}

function highlightFilter(args: ArtworksArgs): SearchFilter[] {
  return args.highlightsOnly === true
    ? [{ arguments: ["highlightsOnly"], params: { isHighlight: true } }]
    : [];
}

function pageStart(after: string | null | undefined): number | null {
  if (after == null) return null;
  const offset = decodeCursor(after);
  if (offset === null || offset >= SEARCH_WINDOW) {
    badInput("after must be a cursor from pageInfo.");
  }
  return offset;
}

function parseSearch(args: ArtworksArgs): ArtworkSearch {
  const term = (args.search ?? "").trim();
  if (term.length > SEARCH_MAX_LENGTH) {
    badInput(`search must be at most ${SEARCH_MAX_LENGTH} characters.`);
  }
  return {
    term,
    first: wholeNumber(args.first, DEFAULT_RESULT_COUNT, 1, MAX_RESULT_COUNT, "first"),
    filters: [...departmentFilter(args), ...yearFilter(args), ...highlightFilter(args)],
    after: pageStart(args.after),
  };
}

async function upstream<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof MetUnavailableError) {
      throw new GraphQLError("The Met collection did not respond. Try again in a moment.", {
        extensions: { code: "UPSTREAM_UNAVAILABLE" },
      });
    }
    throw error;
  }
}

export const resolvers = {
  Query: {
    artworks(_root: unknown, args: ArtworksArgs, context: QueratedContext) {
      const search = parseSearch(args);
      return upstream(() => searchArtworks(search, context));
    },

    artwork(_root: unknown, args: { id: string }, context: QueratedContext) {
      if (!/^\d{1,9}$/.test(args.id)) badInput("id must be a Met object ID.");
      return context.loaders.artwork.load(Number(args.id));
    },

    departments(_root: unknown, _args: unknown, context: QueratedContext) {
      return upstream(() => context.met.departments(context.trace));
    },
  },

  ArtworkResults: {
    // Resolved only when selected, and only spends Met calls when the search came back empty.
    diagnosis(results: ArtworkResults, _args: unknown, context: QueratedContext) {
      return upstream(() => diagnoseEmpty(results, context));
    },
  },

  Artwork: {
    image(artwork: Artwork, args: { size: "SMALL" | "LARGE" }) {
      return args.size === "LARGE" ? artwork.imageLarge : artwork.imageSmall;
    },
  },

  Artist: {
    otherWorks(artist: Artist, args: { first?: number | null }, context: QueratedContext) {
      const first = wholeNumber(args.first, OTHER_WORKS_COUNT, 1, MAX_OTHER_WORKS, "first");
      return otherWorksBy(artist, first, context);
    },
  },
};
