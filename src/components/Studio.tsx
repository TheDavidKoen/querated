"use client";

// The studio orchestrates one run: send the request and fly the query at the same moment, then
// reveal the gallery only when both the animation has landed and the response has arrived.

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { flyTokens, type Point } from "@/animation/flight";
import { useGSAP } from "@/animation/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { EARLIEST_YEAR, latestYear, SEARCH_MAX_LENGTH } from "@/lib/contract";
import { type QueryOutcome, sendQuery } from "@/lib/graphql-client";
import {
  type BuiltQuery,
  buildQuery,
  DEFAULT_QUERY_OPTIONS,
  type QueryOptions,
} from "@/lib/query-builder";
import { AskPanel } from "./AskPanel";
import type { DepartmentOption } from "./FilterFields";
import { GalleryPanel, type Phase } from "./GalleryPanel";
import { type BeamHandle, TransmissionBeam } from "./TransmissionBeam";

type Run = {
  id: number;
  options: QueryOptions;
  sent: BuiltQuery;
  // The startCursor of every page before this one, so Previous returns to exactly those works.
  history: string[];
  landed: boolean;
  outcome: QueryOutcome | null;
};

// What clearing each filter argument resets in the studio's options.
const CLEARED: Record<string, Partial<QueryOptions>> = {
  departmentId: { departmentId: null },
  from: { from: null },
  to: { to: null },
  highlightsOnly: { highlightsOnly: false },
};

function phaseOf(run: Run | null): Phase {
  if (!run) return "idle";
  if (!run.landed) return "sending";
  if (!run.outcome) return "building";
  return run.outcome.data?.artworks ? "done" : "error";
}

function problemWith({ search, from, to }: QueryOptions): string | null {
  const latest = latestYear();
  if (search.trim().length > SEARCH_MAX_LENGTH) {
    return `Keep the search under ${SEARCH_MAX_LENGTH} characters.`;
  }
  if ([from, to].some((year) => year !== null && (year < EARLIEST_YEAR || year > latest))) {
    return `Years run from ${EARLIEST_YEAR} to ${latest}.`;
  }
  if (from !== null && to !== null && from > to) return "From must not be later than To.";
  return null;
}

function onScreen(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function centreOf(rect: DOMRect): Point {
  return {
    x: rect.left + rect.width / 2,
    y: clamp(rect.top + rect.height / 2, 40, window.innerHeight - 40),
  };
}

// The flight starts from the query itself, so the query must be on screen before it takes off.
function bringIntoView(element: HTMLElement): Promise<void> {
  const rect = element.getBoundingClientRect();
  if (rect.top >= 0 && rect.top < window.innerHeight * 0.45) return Promise.resolve();

  element.scrollIntoView({ behavior: "smooth", block: "center" });
  return new Promise((resolve) => {
    const settle = () => {
      window.clearTimeout(fallback);
      window.removeEventListener("scrollend", settle, { capture: true });
      resolve();
    };
    const fallback = window.setTimeout(settle, 800);
    window.addEventListener("scrollend", settle, { capture: true, once: true });
  });
}

export function Studio({ departments }: { departments: DepartmentOption[] }) {
  const [options, setOptions] = useState<QueryOptions>(DEFAULT_QUERY_OPTIONS);
  const [run, setRun] = useState<Run | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const query = useMemo(() => buildQuery(options), [options]);
  const reducedMotion = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<BeamHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runCounter = useRef(0);

  const { contextSafe } = useGSAP({ scope: rootRef });

  const phase = phaseOf(run);
  const busy = phase === "sending" || phase === "building";

  // Any change to the query starts again from the first page.
  const update = (patch: Partial<QueryOptions>) => {
    setOptions((current) => ({ ...current, ...patch, after: null }));
    setHistory([]);
  };

  const fly = contextSafe(async () => {
    const preview = previewRef.current;
    const gallery = galleryRef.current;
    const layer = layerRef.current;
    if (!preview || !gallery || !layer) return;

    await bringIntoView(preview);

    const galleryRect = gallery.getBoundingClientRect();
    const target: Point = {
      x: galleryRect.left + galleryRect.width / 2,
      y: clamp(galleryRect.top + 220, 80, window.innerHeight - 60),
    };
    beamRef.current?.fire(centreOf(preview.getBoundingClientRect()), target);
    await flyTokens(
      Array.from(preview.querySelectorAll<HTMLElement>("[data-token]")),
      target,
      layer,
    );

    if (galleryRect.top > window.innerHeight * 0.6) {
      gallery.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const send = async (
    target: QueryOptions = options,
    earlier: string[] = history,
    flight = true,
  ) => {
    if (busy || problemWith(target) !== null) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    runCounter.current += 1;
    const id = runCounter.current;
    const sent = target === options ? query : buildQuery(target);
    const settle = (patch: Partial<Run>) =>
      setRun((current) => (current?.id === id ? { ...current, ...patch } : current));

    const animate = flight && !reducedMotion;
    setRun({ id, options: target, sent, history: earlier, landed: !animate, outcome: null });
    const response = sendQuery(sent, controller.signal).catch(() => null);

    galleryRef.current?.scrollTo({ top: 0 });
    if (!animate) {
      galleryRef.current?.scrollIntoView({ block: "start" });
    } else {
      await fly();
      settle({ landed: true });
    }

    const outcome = await response;
    if (outcome) settle({ outcome });
  };

  // The preview must show the query before it flies, so the state update is flushed first.
  const applyAndSend = (next: QueryOptions, earlier: string[], flight = true) => {
    flushSync(() => {
      setOptions(next);
      setHistory(earlier);
    });
    void send(next, earlier, flight);
  };

  const clearAndSend = (argumentNames: string[]) => {
    const cleared = argumentNames.map((name) => CLEARED[name]);
    applyAndSend(Object.assign({ ...options, after: null }, ...cleared), []);
  };

  // Pages follow the query that was sent, not unsent edits. The query only flies when it is on
  // screen, so browsing never scrolls away from the gallery.
  const turnPage = (direction: "previous" | "next") => {
    const pageInfo = run?.outcome?.data?.artworks?.pageInfo;
    if (!run || !pageInfo) return;
    const flight = previewRef.current ? onScreen(previewRef.current) : false;
    if (direction === "next" && pageInfo.endCursor) {
      const earlier = [...run.history, pageInfo.startCursor];
      applyAndSend({ ...run.options, after: pageInfo.endCursor }, earlier, flight);
    }
    if (direction === "previous" && run.history.length > 0) {
      const after = run.history.at(-1) ?? null;
      applyAndSend({ ...run.options, after }, run.history.slice(0, -1), flight);
    }
  };

  return (
    <div ref={rootRef}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <AskPanel
          options={options}
          departments={departments}
          query={query}
          previewRef={previewRef}
          busy={busy}
          inFlight={phase === "sending"}
          problem={problemWith(options)}
          onChange={update}
          onSend={() => void send()}
        />
        <GalleryPanel
          sectionRef={galleryRef}
          phase={phase}
          outcome={run?.outcome ?? null}
          variables={run?.sent.variables ?? null}
          runId={run?.id ?? 0}
          page={(run?.history.length ?? 0) + 1}
          onPage={turnPage}
          animate={!reducedMotion}
          departments={departments}
          onClear={clearAndSend}
        />
      </div>

      <TransmissionBeam ref={beamRef} enabled={!reducedMotion} />
      <div ref={layerRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-30" />
    </div>
  );
}
