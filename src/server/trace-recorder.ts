import type { QueryTrace, UpstreamCall } from "@/lib/trace";

const MAX_LISTED_CALLS = 120;

export class TraceRecorder {
  private readonly startedAt = performance.now();
  private readonly calls: UpstreamCall[] = [];

  record(call: Omit<UpstreamCall, "id">): void {
    this.calls.push({ id: this.calls.length + 1, ...call });
  }

  summary(): QueryTrace {
    const count = (matches: (call: UpstreamCall) => boolean) => this.calls.filter(matches).length;
    return {
      upstream: {
        total: this.calls.length,
        network: count((call) => !call.cached),
        cached: count((call) => call.cached),
        failed: count((call) => !call.ok),
        bytes: this.calls.reduce((sum, call) => sum + call.bytes, 0),
      },
      durationMs: Math.round(performance.now() - this.startedAt),
      calls: this.calls.slice(0, MAX_LISTED_CALLS),
      truncated: this.calls.length > MAX_LISTED_CALLS,
    };
  }
}
