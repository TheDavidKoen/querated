import { DOCK } from "@/lib/dock";

// The dock's second stowed bubble, linking back to the author's site.
export function SiteBubble() {
  return (
    <a
      href={DOCK.siteHref}
      target="_blank"
      rel="noopener"
      className="launcher launcher--stowable launcher--order-2"
      inert
      aria-label={DOCK.siteLabel}
      aria-describedby="site-tip"
    >
      {/* biome-ignore lint/performance/noImgElement: next/image writes an inline style attribute, which the Content Security Policy blocks, and a static SVG gains nothing from it. */}
      <img className="launcher__image" src="/d-mark.svg" alt="" width={27} height={27} />
      <span className="launcher__tip" id="site-tip" role="tooltip">
        {DOCK.siteTip}
      </span>
    </a>
  );
}
