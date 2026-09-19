import { GRAPHQL_ENDPOINT, TRACE_EXTENSION } from "./contract";
import { byteLength } from "./format";
import type { BuiltQuery } from "./query-builder";
import type { QueryTrace } from "./trace";

export type ArtworkResult = {
  id: string;
  title: string;
  date?: string | null;
  medium?: string | null;
  dimensions?: string | null;
  department?: string | null;
  culture?: string | null;
  creditLine?: string | null;
  tags?: string[];
  image?: string | null;
  url?: string;
  artist?: ArtistResult | null;
};

export type ArtistResult = {
  name: string;
  nationality?: string | null;
  born?: number | null;
  died?: number | null;
  bio?: string | null;
  otherWorks?: ArtworkResult[];
};

export type FilterCheck = {
  arguments: string[];
  matchesAlone: number;
  matchesWithout: number;
};

export type PageInfo = {
  startCursor: string;
  hasNextPage: boolean;
  endCursor: string | null;
};

export type SearchDiagnosis = {
  searchAlone: number;
  filters: FilterCheck[];
};

type ArtworksData = {
  artworks: {
    total: number;
    items: ArtworkResult[];
    pageInfo: PageInfo;
    diagnosis?: SearchDiagnosis | null;
  } | null;
};

export type ApiError = { message: string; code: string | null };

export type QueryOutcome = {
  status: number;
  data: ArtworksData | null;
  errors: ApiError[];
  trace: QueryTrace | null;
  dataBytes: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrors(value: unknown): ApiError[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((error) => ({
    message: typeof error.message === "string" ? error.message : "Unknown error.",
    code:
      isRecord(error.extensions) && typeof error.extensions.code === "string"
        ? error.extensions.code
        : null,
  }));
}

function failure(status: number, message: string): QueryOutcome {
  return { status, data: null, errors: [{ message, code: null }], trace: null, dataBytes: 0 };
}

export async function sendQuery(query: BuiltQuery, signal: AbortSignal): Promise<QueryOutcome> {
  let response: Response;
  try {
    response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/graphql-response+json, application/json",
      },
      body: JSON.stringify({
        query: query.text,
        variables: query.variables,
        operationName: query.operationName,
      }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return failure(0, "The request did not reach the server. Check your connection and try again.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return failure(response.status, "The server sent a response that could not be read.");
  }
  if (!isRecord(body)) return failure(response.status, "The server sent an empty response.");

  const data = isRecord(body.data) ? (body.data as ArtworksData) : null;
  const extensions = isRecord(body.extensions) ? body.extensions : {};
  const trace = isRecord(extensions[TRACE_EXTENSION])
    ? (extensions[TRACE_EXTENSION] as QueryTrace)
    : null;

  return {
    status: response.status,
    data,
    errors: readErrors(body.errors),
    trace,
    dataBytes: data === null ? 0 : byteLength(JSON.stringify(data)),
  };
}
