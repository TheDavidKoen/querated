"use client";

import type { RefObject } from "react";
import { gsap, useGSAP } from "@/animation/gsap";
import type { ApiError, QueryOutcome } from "@/lib/graphql-client";
import type { QueryVariables } from "@/lib/query-builder";
import { ArtworkCard } from "./ArtworkCard";
import { BehindTheScenes } from "./BehindTheScenes";
import { EmptyResult } from "./EmptyResult";
import type { DepartmentOption } from "./FilterFields";

export type Phase = "idle" | "sending" | "building" | "done" | "error";

type GalleryPanelProps = {
  sectionRef: RefObject<HTMLElement | null>;
  phase: Phase;
  outcome: QueryOutcome | null;
  variables: QueryVariables | null;
  runId: number;
  page: number;
  animate: boolean;
  departments: DepartmentOption[];
  onClear: (argumentNames: string[]) => void;
  onPage: (direction: "previous" | "next") => void;
};

const GRID = "grid gap-6 sm:grid-cols-2 xl:grid-cols-3";
const IDLE_FRAMES = 6;

function statusText(phase: Phase, outcome: QueryOutcome | null, page: number): string {
  switch (phase) {
    case "idle":
      return "Waiting for a query";
    case "sending":
      return "Query in flight";
    case "building":
      return "Building the gallery";
    case "error":
      return "The query came back with errors";
    case "done": {
      const artworks = outcome?.data?.artworks;
      if (!artworks) return "";
      const count = artworks.items.length;
      const paged = page > 1 || artworks.pageInfo.hasNextPage;
      const shown = `${count} visible ${count === 1 ? "match" : "matches"}${paged ? " on this page" : ""}`;
      const summary = `${shown}, from the Met's ${artworks.total.toLocaleString("en-GB")}`;
      return page > 1 ? `Page ${page}, ${summary}` : summary;
    }
  }
}

function Frames({ count, pending }: { count: number; pending: boolean }) {
  return (
    <div className={GRID} aria-hidden="true">
      {Array.from({ length: count }, (_, slot) => `frame-${count}-${slot}`).map((key) => (
        <div
          key={key}
          className={`aspect-4/5 rounded-sm ${pending ? "border-2 border-wall-300 border-dashed" : "bg-wall-200/70 motion-safe:animate-pulse"}`}
        />
      ))}
    </div>
  );
}

const PAGE_BUTTON =
  "rounded-md border border-wall-300 px-4 py-2 font-mono text-sm hover:bg-wall-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

function Pagination({
  page,
  hasNextPage,
  onPage,
}: {
  page: number;
  hasNextPage: boolean;
  onPage: (direction: "previous" | "next") => void;
}) {
  return (
    <nav
      aria-label="Result pages"
      className="flex items-center justify-between gap-4 border-wall-200 border-t pt-6"
    >
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPage("previous")}
        className={PAGE_BUTTON}
      >
        Previous
      </button>
      <p className="font-mono text-wall-700 text-xs">Page {page}</p>
      <button
        type="button"
        disabled={!hasNextPage}
        onClick={() => onPage("next")}
        className={PAGE_BUTTON}
      >
        Next
      </button>
    </nav>
  );
}

function Errors({ errors }: { errors: ApiError[] }) {
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-5 text-red-950">
      <p className="font-display text-lg">The API refused or could not finish this query.</p>
      <ul className="mt-3 space-y-2 text-sm">
        {errors.map((error) => (
          <li key={`${error.code}-${error.message}`}>
            {error.code && (
              <code className="mr-2 rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">
                {error.code}
              </code>
            )}
            {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GalleryPanel({
  sectionRef,
  phase,
  outcome,
  variables,
  runId,
  page,
  animate,
  departments,
  onClear,
  onPage,
}: GalleryPanelProps) {
  useGSAP(
    () => {
      const cards = sectionRef.current?.querySelectorAll(".artwork-card");
      if (phase !== "done" || !animate || !cards?.length) return;
      gsap.from(cards, {
        y: 28,
        opacity: 0,
        scale: 0.97,
        duration: 0.65,
        stagger: 0.07,
        ease: "power3.out",
        clearProps: "transform,opacity",
      });
    },
    { scope: sectionRef, dependencies: [phase, runId, animate] },
  );

  const artworks = outcome?.data?.artworks ?? null;
  const busy = phase === "sending" || phase === "building";
  const expected = variables?.first ?? IDLE_FRAMES;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="gallery-heading"
      aria-busy={busy}
      className="gallery-wall relative min-h-[80vh] text-wall-900 lg:h-dvh lg:overflow-y-auto"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-wall-200 border-b bg-wall-50/85 px-6 py-4 backdrop-blur sm:px-10">
        <h2 id="gallery-heading" className="font-display text-xl">
          The gallery
        </h2>
        <p role="status" className="font-mono text-wall-700 text-xs">
          {statusText(phase, outcome, page)}
        </p>
      </header>

      <div className="px-6 py-8 sm:px-10">
        {phase === "idle" && (
          <div className="space-y-8">
            <p className="max-w-md text-wall-700 leading-relaxed">
              Nothing hangs here yet. Press <strong>Send query</strong> and the works you asked for
              will arrive, carrying only the fields you chose.
            </p>
            <Frames count={IDLE_FRAMES} pending />
          </div>
        )}

        {phase === "sending" && <Frames count={expected} pending />}
        {phase === "building" && <Frames count={expected} pending={false} />}

        {phase === "error" && outcome && <Errors errors={outcome.errors} />}

        {phase === "done" && artworks && (
          <div className="space-y-6">
            {outcome && outcome.errors.length > 0 && <Errors errors={outcome.errors} />}
            {artworks.items.length === 0 && page > 1 ? (
              <p className="max-w-lg text-wall-700 leading-relaxed">
                None of the works checked for this page visibly match your search. Next carries on
                further through the Met's results.
              </p>
            ) : artworks.items.length === 0 && variables ? (
              <EmptyResult
                total={artworks.total}
                failedCalls={outcome?.trace?.upstream.failed ?? 0}
                diagnosis={artworks.diagnosis}
                variables={variables}
                departments={departments}
                onClear={onClear}
              />
            ) : (
              <div className={GRID}>
                {artworks.items.map((artwork) => (
                  <ArtworkCard key={artwork.id} artwork={artwork} />
                ))}
              </div>
            )}
            {artworks.items.length > 0 &&
              variables &&
              artworks.items.length < variables.first &&
              artworks.pageInfo.hasNextPage && (
                <p className="max-w-lg text-sm text-wall-700 leading-relaxed">
                  Only {artworks.items.length} of the works checked for this page visibly match.
                  Next keeps looking further through the Met's results.
                </p>
              )}
            {(page > 1 || artworks.pageInfo.hasNextPage) && (
              <Pagination page={page} hasNextPage={artworks.pageInfo.hasNextPage} onPage={onPage} />
            )}
          </div>
        )}
      </div>

      {(phase === "done" || phase === "error") && outcome?.trace && (
        <BehindTheScenes
          trace={outcome.trace}
          dataBytes={outcome.dataBytes}
          runId={runId}
          animate={animate}
        />
      )}
    </section>
  );
}
