# 0004. Request-scoped DataLoader over a shared cache

**Status:** Accepted · 2026-09-18

## Context

A query for twelve works with their artists' other works resolves `Artwork` twelve times and
`Artist.otherWorks` twelve times, often for the same artist. Resolved naively, that is the N+1
problem twice over: repeated object calls and repeated artist searches, against an API with a
rate limit and no batch endpoint.

## Decision

Two layers.

1. **DataLoader per request**, created in the GraphQL context: `artwork` keyed by object ID and
   `artistWorkIds` keyed by artist name. Within one request, each key is fetched at most once.
2. **A byte-sized LRU cache per server instance**, inside the Met client, keyed by URL: objects
   and departments for 24 hours, searches for an hour, withdrawn IDs for an hour. Up to 32 MB.

Every call, cached or not, runs through one function that also applies a 12-call concurrency
limit, an 8-second timeout and the per-request trace.

## Rationale

The Met has no batch endpoint, so DataLoader cannot merge calls. What it buys here is
de-duplication and a single scheduling point per request, and it must be request-scoped so one
visitor's results never leak into another's memo.

The cache is where repeat traffic stops costing anything. It is our own rather than Next.js's
fetch cache because the trace must say which calls were answered from cache, and Next's data
cache does not report hits.

The concurrency limit keeps a fan-out of forty calls well under The Met's 80 per second, and the
timeout stops one slow record from holding a response open.

## Consequences

- Artists are searched once per request however many works share them, asserted in `yoga.test.ts`.
- A repeat of a query is answered entirely from cache, also asserted.
- The cache is per instance and dies with it. On serverless hosting the hit rate depends on traffic.
- A failed object call drops that work rather than failing the query. The trace counts it.
- A 403 or 429 from the Met's firewall pauses every call for a minute, so a refused burst is not followed by another.
