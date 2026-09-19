# 0007. GSAP for choreography, Three.js for the beam

**Status:** Accepted · 2026-09-18

## Context

The send is the moment the project is built around: the query has to be seen leaving the studio
and arriving in the gallery. That needs per-token motion along curves, staggered reveals, and a
colourful effect across the divider, without hurting first paint or anyone who prefers reduced
motion.

## Decision

- **GSAP** with `MotionPathPlugin` for everything choreographed: the token flight, the card
  reveal and the fan-out diagram, all through `useGSAP` so every tween is reverted on unmount.
- **Three.js** for one effect only, the particle beam: 900 points on a cubic curve, positions
  computed in a vertex shader from a single time uniform, drawn only while a burst is in flight.
- Both are skipped entirely when the operating system asks for reduced motion. Three.js is not
  even downloaded then.

## Rationale

GSAP is free for all use including every plugin, handles interrupted and overlapping timelines
well, and its React hook solves cleanup. CSS transitions cannot follow a curved path per token.

Three.js is the heavier choice, about 129 KB gzipped. It earns its place because hundreds of
additive-blended particles are cheap on the GPU and expensive on the DOM or a 2D canvas. The cost
is contained: it loads in `requestIdleCallback` after the page is interactive, its render loop
stops the moment the burst lands, and it is never on the critical path. If WebGL is unavailable,
the beam simply does not appear.

## Consequences

- The initial bundle carries GSAP, about 51 KB with the studio components; Three.js stays out of it.
- The flight clones visible tokens into a fixed overlay, so the query must be on screen when it takes off; the studio scrolls it into view first.
- GSAP's licence forbids building a visual animation tool that competes with Webflow. Querated is not one.
