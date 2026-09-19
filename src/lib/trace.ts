export type UpstreamCallKind = "search" | "object" | "departments";

export type UpstreamCall = {
  id: number;
  kind: UpstreamCallKind;
  label: string;
  cached: boolean;
  ok: boolean;
  bytes: number;
  ms: number;
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
