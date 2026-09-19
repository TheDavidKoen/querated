// Data access for The Met Collection API. Every upstream call goes through getJson, which owns the
// shared cache, the concurrency limit, the timeout and the per-request trace.

import { LRUCache } from "lru-cache";
import type { UpstreamCallKind } from "@/lib/trace";
import type { TraceRecorder } from "@/server/trace-recorder";
import { createLimiter } from "./limiter";
import type { Department, MetObject, MetSearchParams, MetSearchResult } from "./types";

const API_ROOT = "https://collectionapi.metmuseum.org/public/collection";

const HOUR = 60 * 60 * 1000;
// The Met sits behind a firewall that answers bursts with 403 or 429. After one, every call waits
// out this backoff instead of adding to the burst that caused it.
const BACKOFF_MS = 60 * 1000;

// The Met matches every object for "*", and v1.1 search only reaches the first 10,000 results.
export const WILDCARD = "*";
export const SEARCH_WINDOW = 10_000;
const TTL: Record<UpstreamCallKind, number> = {
  search: HOUR,
  object: 24 * HOUR,
  departments: 24 * HOUR,
};

export class MetUnavailableError extends Error {
  override name = "MetUnavailableError";
}

type CacheEntry = { body: unknown; bytes: number };

type MetClientOptions = {
  fetch?: typeof fetch;
  maxConcurrent?: number;
  timeoutMs?: number;
  cacheBytes?: number;
};

export type MetClient = {
  search(params: MetSearchParams, trace: TraceRecorder): Promise<MetSearchResult>;
  object(id: number, trace: TraceRecorder): Promise<MetObject | null>;
  departments(trace: TraceRecorder): Promise<Department[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// One ordered list of search parameters feeds both the URL, which is also the cache key, and the
// trace label, so the two can never disagree. Flags and zeros that change nothing are omitted.
function searchEntries(params: MetSearchParams): Array<[string, string]> {
  const entries: Array<[string, string | number | undefined]> = [
    ["q", params.q],
    ["artistOrCulture", params.artistOrCulture ? "true" : undefined],
    ["departmentId", params.departmentId],
    ["dateBegin", params.dateBegin],
    ["dateEnd", params.dateEnd],
    ["isHighlight", params.isHighlight ? "true" : undefined],
    ["hasImages", params.hasImages ? "true" : undefined],
    ["limit", params.limit],
    ["offset", params.offset || undefined],
  ];
  return entries.flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]]));
}

function searchUrl(params: MetSearchParams): string {
  return `${API_ROOT}/v1.1/search?${new URLSearchParams(searchEntries(params))}`;
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

const UNLABELLED = new Set(["q", "hasImages", "limit"]);

function searchLabel(params: MetSearchParams): string {
  const details = searchEntries(params)
    .filter(([key]) => !UNLABELLED.has(key))
    .map(([key, value]) => (value === "true" ? key : `${key}=${value}`));
  return [`"${truncate(params.q, 40)}"`, ...details].join(" ");
}

export function createMetClient(options: MetClientOptions = {}): MetClient {
  const fetchJson = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;
  const limit = createLimiter(options.maxConcurrent ?? 12);
  const cache = new LRUCache<string, CacheEntry>({
    maxSize: options.cacheBytes ?? 32 * 1024 * 1024,
    sizeCalculation: (entry) => Math.max(entry.bytes, 1),
  });

  let refusedUntil = 0;

  async function getJson(
    url: string,
    kind: UpstreamCallKind,
    label: string,
    trace: TraceRecorder,
  ): Promise<unknown> {
    const hit = cache.get(url);
    if (hit) {
      trace.record({ kind, label, cached: true, ok: hit.body !== null, bytes: hit.bytes, ms: 0 });
      return hit.body;
    }

    const started = performance.now();
    const elapsed = () => Math.round(performance.now() - started);
    try {
      if (Date.now() < refusedUntil) {
        throw new MetUnavailableError(`The Met is refusing calls, so the ${kind} call was skipped`);
      }
      const { status, text } = await limit(async () => {
        const response = await fetchJson(url, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
        return { status: response.status, text: await response.text() };
      });
      const bytes = Buffer.byteLength(text);

      // The Met answers 404 for withdrawn object IDs that search can still return.
      if (status === 404) {
        cache.set(url, { body: null, bytes }, { ttl: HOUR });
        trace.record({ kind, label, cached: false, ok: false, bytes, ms: elapsed() });
        return null;
      }
      if (status === 403 || status === 429) {
        refusedUntil = Date.now() + BACKOFF_MS;
        throw new MetUnavailableError(`The Met refused the ${kind} call with ${status}`);
      }
      if (status < 200 || status >= 300) {
        throw new MetUnavailableError(`The Met answered ${status} for ${kind}`);
      }

      const body: unknown = JSON.parse(text);
      cache.set(url, { body, bytes }, { ttl: TTL[kind] });
      trace.record({ kind, label, cached: false, ok: true, bytes, ms: elapsed() });
      return body;
    } catch (error) {
      trace.record({ kind, label, cached: false, ok: false, bytes: 0, ms: elapsed() });
      if (error instanceof MetUnavailableError) throw error;
      throw new MetUnavailableError(`The Met did not answer the ${kind} call`, { cause: error });
    }
  }

  return {
    async search(params, trace) {
      const body = await getJson(searchUrl(params), "search", searchLabel(params), trace);
      if (!isRecord(body)) return { total: 0, ids: [] };
      const ids = Array.isArray(body.objectIDs)
        ? body.objectIDs.filter((id): id is number => Number.isInteger(id) && id > 0)
        : [];
      return { total: typeof body.total === "number" ? body.total : ids.length, ids };
    },

    async object(id, trace) {
      const body = await getJson(`${API_ROOT}/v1/objects/${id}`, "object", `#${id}`, trace);
      if (!isRecord(body) || typeof body.objectID !== "number") return null;
      return body as MetObject;
    },

    async departments(trace) {
      const body = await getJson(`${API_ROOT}/v1/departments`, "departments", "all", trace);
      if (!isRecord(body) || !Array.isArray(body.departments)) return [];
      return body.departments
        .filter(isRecord)
        .flatMap((entry) =>
          typeof entry.departmentId === "number" && typeof entry.displayName === "string"
            ? [{ id: entry.departmentId, name: entry.displayName }]
            : [],
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}
