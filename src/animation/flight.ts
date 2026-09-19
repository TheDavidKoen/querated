// The send animation: every visible token of the query is cloned into a fixed overlay and flown
// along a curve into the gallery, so what lands on the right is visibly what was written on the left.

import { gsap } from "./gsap";

export type Point = { x: number; y: number };

const FLIGHT_SECONDS = 1.05;
const MAX_STAGGER_SECONDS = 0.45;
const FADE_SECONDS = 0.22;

function isOnScreen(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
}

export function flyTokens(
  tokens: HTMLElement[],
  target: Point,
  layer: HTMLElement,
): gsap.core.Timeline {
  const timeline = gsap.timeline({ onComplete: () => layer.replaceChildren() });
  const flying = tokens.filter(isOnScreen);
  const step = flying.length > 1 ? Math.min(0.014, MAX_STAGGER_SECONDS / flying.length) : 0;

  flying.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-token");
    clone.classList.add("flight-token");
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    layer.append(clone);

    const dx = target.x - (rect.left + rect.width / 2);
    const dy = target.y - (rect.top + rect.height / 2);
    const lift = -60 - ((index * 37) % 140);
    const start = index * step;

    timeline.to(
      clone,
      {
        motionPath: {
          path: [
            { x: dx * 0.5, y: Math.min(0, dy) + lift },
            { x: dx, y: dy },
          ],
          curviness: 1.25,
        },
        scale: 0.35,
        duration: FLIGHT_SECONDS,
        ease: "power2.inOut",
      },
      start,
    );
    timeline.to(
      clone,
      { opacity: 0, duration: FADE_SECONDS, ease: "power1.in" },
      start + FLIGHT_SECONDS - FADE_SECONDS,
    );
  });

  return timeline;
}
