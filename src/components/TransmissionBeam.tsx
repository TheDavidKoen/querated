"use client";

import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import type { Beam, BeamPoint } from "@/animation/beam";

export type BeamHandle = {
  fire(from: BeamPoint, to: BeamPoint): void;
};

type TransmissionBeamProps = {
  ref: Ref<BeamHandle>;
  enabled: boolean;
};

// Three.js is imported only after the page is idle, and never when motion is reduced, so it costs
// nothing on first paint.
export function TransmissionBeam({ ref, enabled }: TransmissionBeamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamRef = useRef<Beam | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = () => {
      import("@/animation/beam").then(({ createBeam }) => {
        if (cancelled || !canvasRef.current) return;
        beamRef.current = createBeam(canvasRef.current);
      });
    };
    const hasIdleCallback = typeof window.requestIdleCallback === "function";
    const idle = hasIdleCallback
      ? window.requestIdleCallback(load, { timeout: 3000 })
      : window.setTimeout(load, 1500);
    const onResize = () => beamRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      if (hasIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      window.removeEventListener("resize", onResize);
      beamRef.current?.dispose();
      beamRef.current = null;
    };
  }, [enabled]);

  useImperativeHandle(ref, () => ({
    fire(from, to) {
      beamRef.current?.fire(from, to);
    },
  }));

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
