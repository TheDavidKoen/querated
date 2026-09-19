// Shapes returned by the Met Collection API. Object records are typed as unknown values on
// purpose: they are untrusted input, and src/server/models/artwork.ts checks every field it reads.

export type MetObject = { readonly objectID: number } & Readonly<Record<string, unknown>>;

export type MetSearchParams = {
  q: string;
  hasImages: boolean;
  limit: number;
  offset?: number;
  departmentId?: number;
  dateBegin?: number;
  dateEnd?: number;
  isHighlight?: boolean;
  artistOrCulture?: boolean;
};

export type MetSearchResult = {
  total: number;
  ids: number[];
};

export type Department = {
  id: number;
  name: string;
};
