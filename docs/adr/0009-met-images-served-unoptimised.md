# 0009. Met images served unoptimised

**Status:** Accepted · 2026-09-18

## Context

`next/image` can re-encode remote images to AVIF or WebP at the right width, which usually saves
most of an image's bytes. On Vercel's Hobby plan that service includes 5,000 image
transformations a month, and every new image and size it produces counts against them.

Every search in Querated can surface works nobody has viewed before. A few hundred visitors
exploring freely would exhaust the allowance, and on Hobby an exhausted allowance pauses the
feature for up to 30 days, leaving the gallery without images.

## Decision

Render every Met image through `next/image` with `unoptimized`, so the browser loads The Met's
own web-sized JPEG (`primaryImageSmall`) directly from `images.metmuseum.org`. Never load
`primaryImage`, the full-resolution original, in the gallery.

## Rationale

The Met already publishes a web-sized derivative for every Open Access image, served from its own
CDN, so the unoptimised path is still a sensibly sized file. A gallery that always shows its
images beats one that is smaller until it breaks.

## Consequences

- Images are JPEG rather than AVIF or WebP, and larger than they could be.
- Loading stays lazy, decoding asynchronous, and frames keep a fixed aspect ratio, so cumulative layout shift stays at zero.
- `image(size: LARGE)` exists in the schema for API consumers, but the studio never requests it.
- On a paid plan, or with a self-hosted image service, this could be reversed with a `remotePatterns` entry and removing `unoptimized`.
