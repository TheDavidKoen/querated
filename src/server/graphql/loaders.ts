// Request-scoped DataLoaders. The Met has no batch endpoint, so batching cannot merge calls; what
// DataLoader buys here is that each object and each artist is fetched at most once per request,
// however many resolvers ask for it.

import DataLoader from "dataloader";
import type { MetClient } from "@/server/met/client";
import { type Artwork, toArtwork } from "@/server/models/artwork";
import type { TraceRecorder } from "@/server/trace-recorder";

const ARTIST_SEARCH_LIMIT = 12;

// A failed call drops that one work or artist rather than failing the whole query. The trace
// still records the failure.
async function orFallback<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch {
    return fallback;
  }
}

export type Loaders = ReturnType<typeof createLoaders>;

export function createLoaders(met: MetClient, trace: TraceRecorder) {
  return {
    artwork: new DataLoader<number, Artwork | null>((ids) =>
      Promise.all(
        ids.map((id) =>
          orFallback(async () => {
            const record = await met.object(id, trace);
            return record && toArtwork(record);
          }, null),
        ),
      ),
    ),

    artistWorkIds: new DataLoader<string, number[]>((names) =>
      Promise.all(
        names.map((name) =>
          orFallback(async () => {
            const params = {
              q: name,
              artistOrCulture: true,
              hasImages: true,
              limit: ARTIST_SEARCH_LIMIT,
            };
            return (await met.search(params, trace)).ids;
          }, []),
        ),
      ),
    ),
  };
}
