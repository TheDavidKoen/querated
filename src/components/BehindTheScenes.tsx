import { formatBytes, formatMs } from "@/lib/format";
import type { QueryTrace } from "@/lib/trace";
import { FanOut } from "./FanOut";
import { PayloadMeter } from "./PayloadMeter";

type BehindTheScenesProps = {
  trace: QueryTrace;
  dataBytes: number;
  runId: number;
  animate: boolean;
};

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5">
      <dt className="font-mono text-[10.5px] text-ink-400 uppercase tracking-wider">{label}</dt>
      <dd className={`mt-1 font-display text-2xl ${tone}`}>{value}</dd>
    </div>
  );
}

export function BehindTheScenes({ trace, dataBytes, runId, animate }: BehindTheScenesProps) {
  const { upstream } = trace;

  return (
    <section
      id="behind-the-scenes"
      aria-labelledby="behind-heading"
      className="border-ink-800 border-t bg-ink-950 px-6 py-10 text-ink-100 sm:px-10"
    >
      <h2 id="behind-heading" className="font-display text-2xl">
        Behind the scenes
      </h2>

      <div className="mt-8 grid gap-10 xl:grid-cols-2">
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Your requests" value="1" tone="text-syntax-keyword" />
            <Stat label="Met calls" value={String(upstream.network)} tone="text-signal-network" />
            <Stat label="From cache" value={String(upstream.cached)} tone="text-signal-cache" />
            <Stat
              label="Server time"
              value={formatMs(trace.durationMs)}
              tone="text-syntax-argument"
            />
          </dl>
          <FanOut trace={trace} runId={runId} animate={animate} />
          {upstream.failed > 0 && (
            <p className="text-signal-failed text-sm">
              {upstream.failed} {upstream.failed === 1 ? "call" : "calls"} failed or found nothing.
              Those works were left out rather than failing the whole query.
            </p>
          )}
        </div>

        <PayloadMeter dataBytes={dataBytes} rawBytes={upstream.bytes} />
      </div>

      <details className="group mt-8 rounded-lg border border-ink-700 bg-ink-900">
        <summary className="cursor-pointer px-4 py-3 font-mono text-ink-300 text-xs uppercase tracking-wider hover:text-ink-100">
          Every upstream call ({upstream.total})
        </summary>
        <ol className="max-h-72 overflow-y-auto border-ink-700 border-t px-4 py-3 font-mono text-xs">
          {trace.calls.map((call) => (
            <li
              key={call.id}
              className="grid grid-cols-[4.5rem_1fr_auto_auto] gap-3 py-1 text-ink-300"
            >
              <span className={call.ok ? "text-ink-400" : "text-signal-failed"}>{call.kind}</span>
              <span className="truncate text-ink-100">{call.label}</span>
              <span className={call.cached ? "text-signal-cache" : "text-signal-network"}>
                {call.cached ? "cache" : formatMs(call.ms)}
              </span>
              <span className="w-16 text-right">{formatBytes(call.bytes)}</span>
            </li>
          ))}
        </ol>
        {trace.truncated && (
          <p className="border-ink-700 border-t px-4 py-2 text-ink-400 text-xs">
            Showing the first {trace.calls.length} calls.
          </p>
        )}
      </details>
    </section>
  );
}
