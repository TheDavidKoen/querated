# 0006. Nonce-based Content Security Policy

**Status:** Accepted · 2026-09-18

## Context

The page renders text that comes from a third party: titles, artist names and descriptions from
The Met. React escapes it, but a Content Security Policy is the layer that still holds if
something ever renders unescaped. Next.js injects inline scripts to hydrate the page, so a policy
without nonces or hashes must allow `'unsafe-inline'`, which defeats most of its purpose.

Next.js offers two strict options: a per-request nonce set in `proxy.ts`, which forces every page
to render dynamically, or experimental Subresource Integrity hashes, which keep pages static.

## Decision

A nonce per request, generated in `src/proxy.ts`, with `script-src 'self' 'nonce-…'
'strict-dynamic'`, `style-src 'self' 'nonce-…'`, images from `'self'` and `images.metmuseum.org`,
`connect-src 'self'`, and `object-src`, `base-uri`, `form-action` and `frame-ancestors` locked
down. The home page opts into dynamic rendering with `connection()`.

## Rationale

The home page is already dynamic, because it reads the department list at request time, so the
performance cost of nonces is close to nothing here. Subresource Integrity is marked experimental
in the Next.js documentation, and a security control should not depend on an experimental flag.

`'strict-dynamic'` lets the nonced Next.js runtime load its own chunks, including the lazy Three.js
chunk, without listing them. The style policy has no `'unsafe-inline'` in production, which rules
out server-rendered `style` attributes; every component uses classes instead, and GSAP and React
set styles through the CSS Object Model, which the policy permits.

## Consequences

- Lighthouse's `csp-xss` audit passes, and a headless run of a full send records no violations.
- Every page is rendered per request; none can be served from a CDN cache.
- Adding any third-party origin, for images, fonts, analytics or embeds, means editing this policy. The pull request template asks for it.
- Server-rendered markup must never carry a `style` attribute.
