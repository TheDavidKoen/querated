# Performance

The budget is enforced in CI by [`scripts/check-budget.ts`](../scripts/check-budget.ts). The
numbers here and the numbers in that file are one fact stored twice; changing one means changing
the other.

Run it locally:

```sh
pnpm build
pnpm run budget
```

## Budget

Measured as gzipped bytes of what a browser downloads, read from the build manifests rather than
guessed from file names.

| Bucket | Budget | Measured |
|---|---|---|
| Initial JavaScript, everything the home page's HTML requests | 210 KB | 187.2 KB |
| Lazy JavaScript, loaded after the page is idle | 150 KB | 129.4 KB |
| CSS | 12 KB | 7.5 KB |
| Fonts an English page downloads (Basic Latin subsets) | 90 KB | 75.2 KB |

Measured 2026-09-18.

## Where the JavaScript goes

| Chunk | gzip | Loaded |
|---|---|---|
| React, React DOM and the Next.js runtime | about 131 KB | Every page |
| GSAP, MotionPathPlugin and the studio components | about 51 KB | The home page |
| Metadata, error and not-found entries | about 8 KB | The home page |
| Three.js and the beam | about 129 KB | After idle, never with reduced motion |
| Legacy polyfills | about 40 KB | Browsers without ES modules only |

The React and Next.js runtime is the floor for a hydrated React application. What the budget
protects is the gap above it.

Three.js is the single largest dependency and is the reason the beam is lazy. `TransmissionBeam`
imports it through a dynamic `import()` inside `requestIdleCallback`, so it never competes with
first paint or interaction, and a visitor who prefers reduced motion never downloads it. See
[ADR 0007](adr/0007-gsap-for-choreography-three-js-for-the-beam.md).

## Fonts

Fraunces for display and JetBrains Mono for code, both variable, both self-hosted by `next/font`
with `font-display: swap`. Only the Basic Latin subsets download for English text; the others
are declared with `unicode-range` and fetched only if a character needs them. No request goes to
a third-party font host.

## Images

Met images load straight from `images.metmuseum.org` as the web-sized JPEGs The Met publishes,
lazily, with `decoding="async"` and fixed aspect-ratio frames so nothing shifts as they arrive.
They are not re-encoded by Next.js. See [ADR 0009](adr/0009-met-images-served-unoptimised.md).

## Lighthouse

CI serves the production build and audits it three times on the desktop preset. Assertions live
in [`lighthouserc.json`](../lighthouserc.json).

| Category | Asserted | Measured locally, 2026-09-18 |
|---|---|---|
| Performance | warn below 0.9 | 1.0 |
| Accessibility | error below 0.95 | 1.0 |
| Best practices | error below 0.95 | 1.0 |
| SEO | error below 1.0 | 1.0 |
| CLS | error above 0.05 | 0 |
| LCP | warn above 2.5 s | 0.7 s |
| Console errors | error above 0 | 0 |

## Server response time

Most of a send is spent waiting on The Met. Object calls take roughly 300 to 800 ms each, so the
client runs up to 12 at once per server instance.

| Query | Met calls | Server time |
|---|---|---|
| `sunflowers`, default fields, cold cache | 25 | 1.8 s |
| The same query, warm cache | 0 | 3 ms |
| `Hokusai`, every field and `otherWorks`, cold cache | 32 | 2.9 s |

Measured against the live API from a local production build, 2026-09-18. The flight animation
takes about 1.5 seconds, so on a warm cache the gallery is ready before the query lands.

Two rules follow when adding to the schema:

1. **A field that needs another Met call multiplies.** `otherWorks` costs a search per distinct
   artist plus an object call per work. Anything similar belongs behind a DataLoader and is
   priced into the Armor cost limit.
2. **Costs that only matter sometimes should only run sometimes.** `diagnosis` is selected by
   default yet costs nothing unless a search is empty, and then at most seven `limit=1`
   searches, run in parallel.
3. **A search term can cost up to three batches.** Results must visibly match the term, so a
   short page loads another batch of objects, at most three in all. See ADR 0010.
4. **The cache is per instance.** A cold Vercel instance pays full price once. Do not budget on
   warm-cache numbers.
