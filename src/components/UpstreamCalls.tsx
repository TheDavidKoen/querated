"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatBytes, formatMs } from "@/lib/format";
import type { QueryTrace, UpstreamCall, UpstreamFailure } from "@/lib/trace";

type Bubble = {
  id: number;
  failure: UpstreamFailure;
  top: number;
  left: number;
  above: boolean;
};

const ROW = "grid w-full grid-cols-[4.5rem_1fr_auto_auto] gap-3 py-1 text-left text-ink-300";
const BUBBLE_WIDTH = 384;
const GUTTER = 16;
// Long enough to move the pointer from a row onto its bubble without the bubble closing.
const HIDE_DELAY_MS = 150;

function CallCells({ call }: { call: UpstreamCall }) {
  return (
    <>
      <span className={call.ok ? "text-ink-400" : "text-signal-failed"}>{call.kind}</span>
      <span className="truncate text-ink-100">{call.label}</span>
      <span className={call.cached ? "text-signal-cache" : "text-signal-network"}>
        {call.cached ? "cache" : formatMs(call.ms)}
      </span>
      <span className="w-16 text-right">{formatBytes(call.bytes)}</span>
    </>
  );
}

// The list of every upstream call. A failed call opens a bubble with its exact request and the
// reason it failed, on hover or keyboard focus. The bubble is fixed to the viewport so the
// scrolling list cannot clip it.
export function UpstreamCalls({ trace }: { trace: QueryTrace }) {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const bubbleId = useId();

  const cancelHide = () => window.clearTimeout(hideTimer.current);
  const hideSoon = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setBubble(null), HIDE_DELAY_MS);
  };

  const show = (call: UpstreamCall, failure: UpstreamFailure, row: HTMLElement) => {
    cancelHide();
    const rect = row.getBoundingClientRect();
    const above = rect.bottom > window.innerHeight * 0.6;
    const widest = Math.min(BUBBLE_WIDTH, window.innerWidth - GUTTER * 2);
    setBubble({
      id: call.id,
      failure,
      top: above ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(GUTTER, Math.min(rect.left, window.innerWidth - widest - GUTTER)),
      above,
    });
  };

  useEffect(() => {
    if (!bubble) return;
    const hide = () => setBubble(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
    };
  }, [bubble]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  return (
    <>
      <ol className="max-h-72 overflow-y-auto border-ink-700 border-t px-4 py-3 font-mono text-xs">
        {trace.calls.map((call) => {
          const { failure } = call;
          return (
            <li key={call.id}>
              {failure ? (
                <button
                  type="button"
                  aria-describedby={bubble?.id === call.id ? bubbleId : undefined}
                  onPointerEnter={(event) => show(call, failure, event.currentTarget)}
                  onPointerLeave={hideSoon}
                  onFocus={(event) => show(call, failure, event.currentTarget)}
                  onBlur={hideSoon}
                  onClick={(event) => show(call, failure, event.currentTarget)}
                  className={`${ROW} cursor-help rounded-sm hover:bg-ink-800 focus-visible:bg-ink-800 focus-visible:outline-1 focus-visible:outline-signal-failed`}
                >
                  <CallCells call={call} />
                </button>
              ) : (
                <div className={ROW}>
                  <CallCells call={call} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {bubble && (
        <div
          id={bubbleId}
          role="tooltip"
          onPointerEnter={cancelHide}
          onPointerLeave={hideSoon}
          style={{
            top: bubble.top,
            left: bubble.left,
            maxWidth: `min(${BUBBLE_WIDTH}px, calc(100vw - ${GUTTER * 2}px))`,
          }}
          className={`fixed z-40 rounded-lg border border-signal-failed/60 bg-ink-950 p-3 font-mono text-xs shadow-xl ${bubble.above ? "-translate-y-full" : ""}`}
        >
          <p className="text-ink-400">
            GET <span className="select-all break-all text-ink-100">{bubble.failure.url}</span>
          </p>
          <p className="mt-2 font-sans text-signal-failed text-sm">{bubble.failure.reason}</p>
        </div>
      )}
    </>
  );
}
