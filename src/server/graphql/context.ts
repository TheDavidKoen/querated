import type { MetClient } from "@/server/met/client";
import { TraceRecorder } from "@/server/trace-recorder";
import { createLoaders, type Loaders } from "./loaders";

export type QueratedContext = {
  met: MetClient;
  trace: TraceRecorder;
  loaders: Loaders;
};

export function createContextFactory(met: MetClient): () => QueratedContext {
  return () => {
    const trace = new TraceRecorder();
    return { met, trace, loaders: createLoaders(met, trace) };
  };
}
