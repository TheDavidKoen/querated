// Explains an empty search. It counts what the search term finds with no filters, then for each
// filter what it allows on its own and what would match without it. Each distinct combination of
// filters costs one Met search, and the combination that already came back empty costs nothing.

import type { MetSearchParams } from "@/server/met/types";

export type FilterParams = Pick<
  MetSearchParams,
  "departmentId" | "dateBegin" | "dateEnd" | "isHighlight"
>;

export type SearchFilter = {
  arguments: string[];
  params: FilterParams;
};

export type FilterCheck = {
  arguments: string[];
  matchesAlone: number;
  matchesWithout: number;
};

export type SearchDiagnosis = {
  searchAlone: number;
  filters: FilterCheck[];
};

export async function diagnose(
  filters: SearchFilter[],
  count: (params: FilterParams) => Promise<number>,
): Promise<SearchDiagnosis> {
  const every = filters.map((_, index) => index);
  const memo = new Map<string, Promise<number>>([[every.join(","), Promise.resolve(0)]]);

  const matches = (indexes: number[]): Promise<number> => {
    const key = indexes.join(",");
    const known = memo.get(key);
    if (known) return known;
    const pending = count(Object.assign({}, ...indexes.map((index) => filters[index]?.params)));
    memo.set(key, pending);
    return pending;
  };

  const [searchAlone, checks] = await Promise.all([
    matches([]),
    Promise.all(
      filters.map(async (filter, index) => {
        const [matchesAlone, matchesWithout] = await Promise.all([
          matches([index]),
          matches(every.filter((other) => other !== index)),
        ]);
        return { arguments: filter.arguments, matchesAlone, matchesWithout };
      }),
    ),
  ]);

  return { searchAlone, filters: checks };
}
