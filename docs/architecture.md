# Architecture

Querated is one Next.js application with two halves: a studio that runs in the browser and a
GraphQL API that runs on the server. They meet at exactly one place, `POST /api/graphql`.

## Layers

It is the MVC split, drawn along the server boundary.

| Layer | Role | Lives in |
|---|---|---|
| Model | Fetches from The Met and caches; turns untrusted records into `Artwork` and `Artist`; runs searches, sampling and the empty-result diagnosis | `src/server/met/`, `src/server/models/`, `src/server/services/` |
| Controller | The schema is the contract; resolvers validate arguments, call a service and translate errors | `src/server/graphql/`, `src/app/api/graphql/route.ts` |
| View | The studio and gallery, rendered from the query the user built and the response it got | `src/components/`, `src/app/` |

`src/lib/` holds framework-free code both sides share: the limits in `contract.ts`, the trace
types and the query builder.

## One send, end to end

```text
studio state (QueryOptions)
      │  buildQuery: tokens for the preview, text and variables for the wire
      ▼
Studio.send ──────────────┬───────────────────────────────────────────┐
      │                   │                                           │
      │  fetch POST /api/graphql                    flyTokens + Beam.fire
      ▼                                                               │
route.ts: size cap, rate limit                                        │
      ▼                                                               │
Yoga: parse ─ Armor limits ─ validate ─ execute                       │
      │                                                               │
      ├─ Query.artworks ─ parseSearch ─ searchArtworks                │
      │        ├─ met.search (v1.1), after a count when empty         │
      │        └─ loaders.artwork.loadMany per batch ─ matchesTerm    │
      ├─ ArtworkResults.diagnosis ─ diagnoseEmpty, only when empty    │
      ├─ Artist.otherWorks ─ otherWorksBy ─ loaders.artistWorkIds     │
      │                                                               │
      └─ queryTracePlugin: extensions.querated = trace.summary()      │
      ▼                                                               ▼
response ───────────────────────► gallery reveals when both have finished
```

The request and the animation start together. The gallery shows its built state only when both
the flight has landed and the response has arrived, so a fast cached response still lets the
query finish its journey, and a slow one shows skeleton frames after landing.

## Import rules

| Module | May import |
|---|---|
| `src/lib/*` | Other `src/lib/*` only |
| `src/server/met/*` | `src/lib/*`, `src/server/trace-recorder.ts` |
| `src/server/models/*` | `src/server/met/types.ts`, each other |
| `src/server/services/*` | `src/server/met/*`, `src/server/models/*`, `src/server/trace-recorder.ts`, each other |
| `src/server/graphql/*` | `src/lib/*`, `src/server/*` |
| `src/app/api/*` | `src/lib/*`, `src/server/*` |
| `src/components/*` | `src/lib/*`, `src/animation/*`, `src/hooks/*`, other components |
| `src/app/page.tsx` | Components, `src/lib/*`, `src/server/departments.ts` |

Components never import from `src/server/`. `scripts/check-budget.ts` enforces the effect of that
rule on the build: it fails if the Met API host appears in any client chunk.

## Where state lives

| State | Scope | Holder |
|---|---|---|
| Form choices and the built query | One browser tab | `Studio` component state |
| The current run and its outcome | One browser tab | `Studio` component state |
| DataLoader memo | One GraphQL request | `createLoaders`, called per request |
| Upstream trace | One GraphQL request | `TraceRecorder`, called per request |
| Met response cache | One server instance | `createMetClient`, called once in `met/instance.ts` |
| Rate limit window | One server instance | `createRateLimiter`, called once in `route.ts` |

Nothing is persisted. A cold server instance starts with an empty cache.

## The trace

`TraceRecorder` is created with each request's context. Every call through `getJson` in the Met
client records its kind, label, cache status, success, bytes and time, whether it hit the network
or the cache. `queryTracePlugin` attaches the summary to the response as `extensions.querated`,
the extension point the GraphQL specification reserves for this kind of metadata. The client
reads it for the Behind the scenes panel and the payload meter.

The raw byte figure counts cached responses too. It answers "what would a browser have
downloaded calling The Met directly", and that browser has no cache of ours.

## Changing things

| To | Edit |
|---|---|
| Add a field to `Artwork` | `models/artwork.ts`, `type-defs.ts`, then `query-builder.ts` and `ArtworkCard.tsx` if the studio shows it |
| Add a filter | `contract.ts` for its limit, `type-defs.ts`, `resolvers.ts` to parse it, `met/client.ts` for the search parameter, `query-builder.ts`, `FilterFields.tsx`, and `CLEARED` in `Studio.tsx` |
| Change how a search term matches | `models/search-match.ts`, with a note in ADR 0010 |
| Change batching or sampling | `services/artworks.ts` |
| Change a limit | `contract.ts` only |
| Change the Armor limits | `plugins.ts`, then `yoga.test.ts` proves the largest studio query still passes |
| Allow a new image or link host | `models/artwork.ts` and the Content Security Policy in `proxy.ts` together, with a note in ADR 0006 |
| Change the flight | `animation/flight.ts` |
| Change the beam | `animation/beam.ts` |
