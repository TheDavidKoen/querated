// Limits and names shared by the GraphQL API and the studio. The server enforces every one of
// these; the studio reads them so its controls can never ask for more than the API allows.

export const GRAPHQL_ENDPOINT = "/api/graphql";
export const TRACE_EXTENSION = "querated";

export const MAX_BODY_BYTES = 8 * 1024;

export const SEARCH_MAX_LENGTH = 80;

export const RESULT_COUNTS = [6, 12, 24] as const;
export const DEFAULT_RESULT_COUNT = 12;
export const MAX_RESULT_COUNT = 24;

export const OTHER_WORKS_COUNT = 3;
export const MAX_OTHER_WORKS = 6;

export const MAX_DEPARTMENT_ID = 1000;

export const EARLIEST_YEAR = -10000;

export function latestYear(): number {
  return new Date().getFullYear();
}
