"use client";

// A stowed dock bubble and the tech stack sheet it opens. The sheet is a native dialog, which
// traps focus and closes on Escape; the click listener adds closing from the backdrop, whose
// click target is the dialog itself.

import { useEffect, useRef, useState } from "react";
import { ADR_BASE, DOCK, STACK } from "@/lib/dock";

export function StackBubble() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const [openedByPointer, setOpenedByPointer] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const dismiss = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", dismiss);
    return () => dialog.removeEventListener("click", dismiss);
  }, []);

  return (
    <>
      <button
        ref={bubbleRef}
        type="button"
        className="launcher launcher--stowable launcher--order-1"
        inert
        aria-label={DOCK.stackLabel}
        aria-haspopup="dialog"
        aria-describedby="stack-tip"
        onPointerDown={() => setOpenedByPointer(true)}
        onKeyDown={() => setOpenedByPointer(false)}
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className="launcher__mark launcher__mark--stack" aria-hidden="true" />
        <span className="launcher__tip" id="stack-tip" role="tooltip">
          {DOCK.stackTip}
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="sheet"
        aria-labelledby="stack-heading"
        onClose={() => {
          if (openedByPointer) bubbleRef.current?.blur();
        }}
      >
        <header className="sheet__bar">
          <div>
            <p className="font-mono text-syntax-argument text-xs uppercase tracking-[0.18em]">
              {DOCK.stackEyebrow}
            </p>
            <h2 id="stack-heading" className="mt-2 font-display text-2xl">
              {DOCK.stackHeading}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={DOCK.close}
            className="shrink-0 text-2xl text-ink-400 leading-none transition-colors hover:text-ink-100"
          >
            &times;
          </button>
        </header>

        <div className="sheet__body">
          <dl className="grid gap-6">
            {STACK.map((entry) => (
              <div key={entry.choice} className="stack__row">
                <dt className="grid content-start gap-1">
                  <span className="font-mono text-ink-400 text-xs uppercase tracking-[0.18em]">
                    {entry.layer}
                  </span>
                  <span className="font-display text-lg">{entry.choice}</span>
                  {entry.logo && (
                    // biome-ignore lint/performance/noImgElement: next/image writes an inline style attribute, which the Content Security Policy blocks, and a static SVG gains nothing from it.
                    <img
                      className="stack__logo"
                      src={entry.logo}
                      alt=""
                      width={24}
                      height={24}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </dt>
                <dd className="m-0 text-ink-300 text-sm leading-relaxed">
                  {entry.why}
                  {entry.adr && (
                    <a
                      href={`${ADR_BASE}/${entry.adr}.md`}
                      target="_blank"
                      rel="noopener"
                      className="ml-2 whitespace-nowrap font-mono text-syntax-field text-xs underline-offset-4 hover:underline"
                    >
                      ADR {entry.adr.slice(0, 4)}
                    </a>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </dialog>
    </>
  );
}
