export type UpstreamCallKind = "search" | "object" | "departments";

// Only failed calls carry their request, so the trace stays small when everything works.
export type UpstreamFailure = {
  url: string;
  reason: string;
};

export type UpstreamCall = {
  id: number;
  kind: UpstreamCallKind;
  label: string;
  cached: boolean;
  ok: boolean;
  bytes: number;
  ms: number;
  failure?: UpstreamFailure;
};

export type QueryTrace = {
  upstream: {
    total: number;
    network: number;
    cached: number;
    failed: number;
    bytes: number;
  };
  durationMs: number;
  calls: UpstreamCall[];
  truncated: boolean;
};
