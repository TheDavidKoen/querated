import { formatBytes } from "@/lib/format";

type PayloadMeterProps = {
  dataBytes: number;
  rawBytes: number;
};

function Bar({
  label,
  bytes,
  max,
  color,
}: {
  label: string;
  bytes: number;
  max: number;
  color: string;
}) {
  const width = max > 0 ? Math.max(0.5, (bytes / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 font-mono text-xs">
        <span className="text-ink-300">{label}</span>
        <span className="text-ink-100">{formatBytes(bytes)}</span>
      </div>
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" className="h-2 w-full">
        <rect width="100" height="6" rx="3" fill="var(--color-ink-800)" />
        <rect width={width} height="6" rx="3" fill={color} />
      </svg>
    </div>
  );
}

export function PayloadMeter({ dataBytes, rawBytes }: PayloadMeterProps) {
  const max = Math.max(dataBytes, rawBytes);
  const ratio = dataBytes > 0 ? rawBytes / dataBytes : 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-ink-100 text-lg">Payload</h3>
        <p className="mt-1 text-ink-300 text-sm leading-relaxed">
          What your browser received, against what the same works cost from the Met directly.
        </p>
      </div>

      <Bar label="GraphQL data" bytes={dataBytes} max={max} color="var(--color-syntax-field)" />
      <Bar label="Raw Met JSON" bytes={rawBytes} max={max} color="var(--color-syntax-keyword)" />

      {ratio > 1 && (
        <p className="font-display text-3xl text-ink-100">
          {ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}x{" "}
          <span className="text-ink-300 text-lg">smaller</span>
        </p>
      )}
    </div>
  );
}
