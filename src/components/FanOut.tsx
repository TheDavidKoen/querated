"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/animation/gsap";
import type { QueryTrace } from "@/lib/trace";

const WIDTH = 360;
const HEIGHT = 188;
const BROWSER = { x: 22, y: HEIGHT / 2 };
const SERVER = { x: 118, y: HEIGHT / 2 };
const COLUMN_START = 200;
const ROWS = 12;
const MAX_DOTS = 72;

const STROKE = {
  network: "var(--color-signal-network)",
  cache: "var(--color-signal-cache)",
  failed: "var(--color-signal-failed)",
};

type FanOutProps = { trace: QueryTrace; runId: number; animate: boolean };

// One request enters the server; each Met call leaves it as a line. Calls answered from the cache
// never leave the server, so they orbit it instead of reaching the Met column.
export function FanOut({ trace, runId, animate }: FanOutProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const network = trace.calls.filter((call) => !call.cached).slice(0, MAX_DOTS);
  const cached = trace.calls.filter((call) => call.cached).slice(0, MAX_DOTS);
  const hidden = trace.upstream.total - network.length - cached.length;

  useGSAP(
    () => {
      const svg = svgRef.current;
      if (!animate || !svg) return;
      const lines = svg.querySelectorAll(".fan-line");
      const dots = svg.querySelectorAll(".fan-dot");
      if (lines.length > 0) {
        gsap.fromTo(
          lines,
          { attr: { "stroke-dashoffset": 1 } },
          { attr: { "stroke-dashoffset": 0 }, duration: 0.7, stagger: 0.012, ease: "power2.out" },
        );
      }
      if (dots.length > 0) {
        gsap.from(dots, {
          scale: 0,
          transformOrigin: "50% 50%",
          duration: 0.35,
          stagger: 0.012,
          delay: 0.3,
        });
      }
    },
    { scope: svgRef, dependencies: [runId, animate] },
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`One request to Querated, ${trace.upstream.network} calls to the Met, ${trace.upstream.cached} answered from cache.`}
      className="h-auto w-full"
    >
      <line
        className="fan-line"
        x1={BROWSER.x}
        y1={BROWSER.y}
        x2={SERVER.x}
        y2={SERVER.y}
        stroke="var(--color-syntax-keyword)"
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
      />

      {network.map((call, index) => {
        const x = COLUMN_START + Math.floor(index / ROWS) * 14;
        const y = 18 + (index % ROWS) * 13.5;
        const stroke = call.ok ? STROKE.network : STROKE.failed;
        return (
          <g key={call.id}>
            <path
              className="fan-line"
              d={`M ${SERVER.x} ${SERVER.y} C ${SERVER.x + 50} ${SERVER.y}, ${x - 50} ${y}, ${x} ${y}`}
              fill="none"
              stroke={stroke}
              strokeOpacity={0.55}
              strokeWidth={1}
              pathLength={1}
              strokeDasharray={1}
            />
            <circle className="fan-dot" cx={x} cy={y} r={3.2} fill={stroke} />
          </g>
        );
      })}

      {cached.map((call, index) => {
        const angle = (index / Math.max(cached.length, 1)) * Math.PI * 2;
        const radius = 30 + (index % 3) * 6;
        const x = SERVER.x + Math.cos(angle) * radius;
        const y = SERVER.y + Math.sin(angle) * radius;
        return (
          <circle key={call.id} className="fan-dot" cx={x} cy={y} r={2.6} fill={STROKE.cache} />
        );
      })}

      <circle cx={BROWSER.x} cy={BROWSER.y} r={9} fill="var(--color-syntax-keyword)" />
      <circle
        cx={SERVER.x}
        cy={SERVER.y}
        r={15}
        fill="var(--color-ink-900)"
        stroke="var(--color-syntax-argument)"
        strokeWidth={2}
      />
      <text
        x={BROWSER.x}
        y={BROWSER.y + 26}
        textAnchor="middle"
        className="fill-ink-300 font-mono text-[9px]"
      >
        you
      </text>
      <text
        x={SERVER.x}
        y={SERVER.y + 50}
        textAnchor="middle"
        className="fill-ink-300 font-mono text-[9px]"
      >
        querated
      </text>
      <text x={COLUMN_START} y={HEIGHT - 2} className="fill-ink-300 font-mono text-[9px]">
        {hidden > 0 ? `the met, +${hidden} more` : "the met"}
      </text>
    </svg>
  );
}
