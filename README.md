# querated

**Querated** asks The Metropolitan Museum of Art's open collection questions in GraphQL, and
shows you what happens when it does. The left half of the screen is a studio: choose a search,
filters and fields, and the query writes itself. Press send and the query flies across the
screen, token by token, into the right half, where a gallery builds itself in exactly the shape
of the query. Underneath, the server shows its working: every call it made to The Met, which
ones the cache answered, and how many bytes GraphQL saved.

## What it does

| Area | Behaviour |
|---|---|
| Studio | Search, suggestions, department, year range, highlights and result count, plus field toggles for the artwork, its artist and the artist's other works |
| Live query | The GraphQL document and its variables update on every change, syntax coloured |
| Send | The query's tokens fly into the gallery along curved paths while a Three.js particle beam crosses the divider |
| Gallery | Cards render only the fields that came back, labelled with their GraphQL field names |
| Behind the scenes | One request in, every upstream call out: counts, cache hits, server time, a fan-out diagram and the full call list |
| Payload | GraphQL response bytes against the raw Met JSON the same works cost |
| Empty results | Names the filter that emptied a search, shows what each filter allows on its own, and clears it in one click |

The one endpoint is `POST /api/graphql`. What changes between sends is the query, so the query
is what flies. Filters appear as arguments, and everything you type travels as a variable, never
inside the document.

## The API

```graphql
query SearchArtworks($search: String, $first: Int) {
  artworks(search: $search, first: $first) {
    total
    items {
      id
      title
      date
      image(size: SMALL)
      artist {
        name
        otherWorks(first: 3) { id title image(size: SMALL) }
      }
    }
  }
}
```

| Type | Carries |
|---|---|
| `Query.artworks` | Search with `departmentId`, `from`, `to`, `highlightsOnly` and `first`. The search term always applies and must visibly appear in each result; filters only narrow it. With no term, a random sample of every work the filters allow. Returns works with an Open Access image only |
| `ArtworkResults.diagnosis` | Null unless nothing matched. Then: what the search term finds alone, and for each filter what it allows alone and what would match without it |
| `Query.artwork` | One work by its Met object ID |
| `Query.departments` | The curatorial departments, for the `departmentId` filter |
| `Artwork` | Title, dates, medium, dimensions, department, culture, credit line, tags, links and `image(size: SMALL \| LARGE)` |
| `Artist` | Name, nationality, life dates, biography and `otherWorks(first:)` |

Every response carries `extensions.querated`, the trace the Behind the scenes panel draws. This
one is from a cold `sunflowers` query, with its 25 call entries left out:

```json
{
  "upstream": { "total": 25, "network": 25, "cached": 0, "failed": 0, "bytes": 52801 },
  "durationMs": 1762,
  "calls": [],
  "truncated": false
}
```

Each entry in `calls` records the call's `kind` (`search`, `object` or `departments`), a `label`,
whether it was `cached`, whether it was `ok`, and its `bytes` and `ms`.

The full schema, with descriptions, is in [`src/server/graphql/type-defs.ts`](src/server/graphql/type-defs.ts).

## The search always wins

The Met's search also reads catalogue text its API never returns, so on its own `cats` brings back
frog amulets, oil lamps and mace heads. Querated shows a work only when every word of the search
appears in its title, object type, subjects, artist, culture, medium or classification, with
plurals and accents ignored. Measured on the live API, `cats` between -500 and 300 goes from 32
Met matches to 8 works that are all visibly cats. When a batch leaves the page short, the server
checks up to two more before settling. See
[ADR 0010](docs/adr/0010-search-terms-must-visibly-match.md).

## Why nothing matched

When a search comes back empty, "try removing a filter" is a guess. `diagnosis` replaces the
guess with counts. It is an ordinary field, resolved only when selected, and it asks The Met
nothing unless `total` is zero. Then it runs one cheap `limit=1` search per distinct combination
of filters, and never repeats the combination that already came back empty:

| Filters applied | Extra Met searches |
|---|---|
| None | 0, the search term itself is the answer |
| One | 1 |
| Two | 3 |
| Three | 7 |

Measured against the live API: `sunflowers` in Arms and Armor with highlights only matches
nothing, yet the department allows 5 works on its own and highlights allow 3. The gallery says
so, marks a filter red when it rules out every match by itself, and offers to clear any filter
and send again. The extra searches appear in Behind the scenes like any other call.

## One request in, many calls out

The Met's search returns bare object IDs, so a gallery of twelve costs one search plus one call
per work, and `otherWorks` adds a search per artist. Measured against the live API:

| Query | Met calls | Server time | GraphQL data | Raw Met JSON |
|---|---|---|---|---|
| `sunflowers`, default fields, cold | 25 | 1.8 s | 3.8 KB | 52.8 KB |
| The same query again | 0 (25 cached) | 3 ms | 3.8 KB | 52.8 KB |
| `Hokusai` with every field and `otherWorks` | 32 | 2.9 s | 14 KB | 99 KB |

Three things keep that honest and cheap. Request-scoped DataLoaders fetch each object and each
artist at most once per request. A shared in-memory cache answers repeats. A concurrency limit
keeps any burst well under The Met's published 80 requests per second. See
[ADR 0004](docs/adr/0004-request-scoped-dataloader-over-shared-cache.md).

## Privacy and security

No cookies, no accounts, no analytics and no storage. Searches are sent as POST bodies, so they
never appear in URLs or access logs, and nothing about a visitor is kept beyond a one-minute rate
limit window held in memory.

| Guard | Detail |
|---|---|
| Query limits | Depth 6, cost 1,500 (list sizes priced in), 4 aliases, 8 directives, 600 tokens, via GraphQL Armor, before execution |
| Argument limits | `first` 1 to 24, `otherWorks(first:)` 1 to 6, search up to 80 characters, years from -10000 to this year |
| Transport | 8 KB request cap, 20 requests a minute per address, POST only in production, no CORS headers |
| Errors | Unexpected errors are masked; only deliberate `BAD_USER_INPUT` and `UPSTREAM_UNAVAILABLE` messages reach clients |
| Schema | Introspection and field suggestions are off in production |
| Browser | Nonce-based Content Security Policy with `strict-dynamic`, HSTS, frame denial, no referrer to image hosts |
| Upstream data | Only `https` URLs on `images.metmuseum.org`, `www.metmuseum.org` and `www.wikidata.org` pass through |

See [SECURITY.md](SECURITY.md) and [ADR 0005](docs/adr/0005-query-hardening-before-execution.md).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, Turbopack |
| Language | TypeScript, `strict` |
| GraphQL server | GraphQL Yoga in a route handler, graphql 16 |
| Batching | DataLoader, one set per request |
| Cache | lru-cache, byte-sized, per server instance |
| Query hardening | GraphQL Armor |
| Motion | GSAP with MotionPathPlugin; Three.js for the beam, loaded when idle |
| Styling | Tailwind CSS v4, fonts self-hosted by `next/font` |
| Tests | Vitest |
| Lint + format | Biome |
| Audits | Lighthouse CI and a bundle budget script |
| Host | Vercel Hobby, through its Git integration |
| Package manager | pnpm |

Every service is on a free tier. See [`docs/adr/`](docs/adr) for why each was chosen.

## Getting started

```sh
pnpm install
pnpm dev
```

The studio runs at **http://localhost:3000**. In development GraphiQL is served at
`/api/graphql` and introspection is on; both are off in production.

To see what visitors get, including the Content Security Policy:

```sh
pnpm build
pnpm start
```

`.env.example` lists the one optional setting, `NEXT_PUBLIC_SITE_URL`.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm run typecheck` | Next route types, then `tsc`, no emit |
| `pnpm lint` | Biome lint and format check |
| `pnpm run lint:fix` | Apply Biome's safe fixes |
| `pnpm test` | Unit and API tests |
| `pnpm run budget` | Performance budget and client bundle guards, after a build |
| `pnpm verify` | Types, lint, tests, build and budget. Run before opening a PR |

## Project structure

```text
src/
├── app/                    Routes and metadata (views and route controllers)
│   ├── api/graphql/        The GraphQL endpoint: size cap, rate limit, then Yoga
│   ├── page.tsx            The studio page, rendered per request for the CSP nonce
│   ├── layout.tsx          Document shell, fonts and metadata
│   └── robots.ts, sitemap.ts, manifest.ts, opengraph-image.tsx, icon.svg
├── proxy.ts                Content Security Policy with a per-request nonce
├── server/                 Server-only code (model and controller layers)
│   ├── met/                Met Collection API client, cache, concurrency limit
│   ├── models/             Untrusted Met records to Artwork and Artist, visible matching
│   ├── services/           Searching, sampling, batching and the empty-result diagnosis
│   ├── graphql/            Schema, resolvers, DataLoaders, plugins, Yoga assembly
│   ├── departments.ts      The department list the page renders
│   ├── rate-limit.ts       Per-address request budget
│   └── trace-recorder.ts   The per-request upstream trace
├── lib/                    Shared, framework-free code
│   ├── contract.ts         Limits shared by the API and the studio
│   ├── query-builder.ts    Builds the query as tokens and variables
│   ├── graphql-client.ts   The studio's one fetch
│   └── site.ts             Title, description and canonical address
├── components/             React components, one concern each
├── animation/              GSAP flight and the Three.js beam
└── hooks/                  Reduced motion
scripts/
└── check-budget.ts         Performance budget and bundle guards
docs/
├── adr/                    Architecture decision records
├── architecture.md         How the pieces fit
└── performance.md          Budget and measurements
```

Tests sit beside the file they test, as `<name>.test.ts`.

**Nothing under `src/components/` imports from `src/server/`.** The studio talks to the server
only through `/api/graphql`, and the budget script fails the build if the Met API host ever
appears in a client bundle.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit format and the pre-PR
checklist.

## Continuous integration

Every pull request into `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Job | Step | Does |
|---|---|---|
| Verify | Types | `next typegen` and `tsc` |
| Verify | Lint and format | Biome |
| Verify | Tests | Every studio query validated against the schema, the model, the rate limiter and the API against a fake Met |
| Verify | Production build | `next build` |
| Verify | Budget and guards | Fails over budget, or if server code or source maps reach the browser |
| Verify | Dependency audit | Fails on a high or critical advisory in production dependencies |
| Lighthouse | Audit | Three desktop runs: SEO 100, accessibility and best practices 95 or higher, no console errors |

Actions are pinned to commit SHAs, and Dependabot keeps them and the npm dependencies current.

## Deployment

Vercel builds and deploys through its own GitHub integration: production from `main`, a preview
for every pull request. No deploy token is stored in GitHub. See
[ADR 0008](docs/adr/0008-vercel-through-its-git-integration.md).

The project needs two environment variables and nothing else:

| Variable | Value | Why |
|---|---|---|
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | Vercel's own pnpm stops at 10. Corepack installs the pnpm 11 pinned in `packageManager` |
| `NEXT_PUBLIC_SITE_URL` | The production address | The canonical URL in metadata, the sitemap and `robots.txt`. It is inlined at build time, so a change needs a redeploy |

The framework preset, build command and Node.js version are detected: Next.js, `pnpm build`
and 24.x from `engines.node`.

Versions are cut by tag. Bump `version` in `package.json` and add a matching `CHANGELOG.md`
entry in a pull request, then after it merges:

```sh
git tag v0.2.0
git push origin v0.2.0
```

[`.github/workflows/release.yml`](.github/workflows/release.yml) reruns CI on the tagged commit,
checks the tag against `package.json` and `CHANGELOG.md`, and publishes a GitHub release with the
changelog entry as notes.

## The Met's data

Collection data and images come from
[The Metropolitan Museum of Art Collection API](https://metmuseum.github.io/), released under
Creative Commons Zero, and are used under The Met's terms. Querated is an independent project and
is not affiliated with or endorsed by The Metropolitan Museum of Art.

## Known issues

**TypeScript is held on 6.x.** TypeScript 7 no longer ships the JavaScript compiler API that
`next build` uses for its type check. Dependabot ignores the major version until Next.js supports
it.

**graphql is held on 16.x.** GraphQL Armor depends on graphql 16, and two copies of graphql in one
process cannot share a schema. graphql 16 also ships CommonJS and ESM builds without an exports
map, so `vitest.config.ts` pins tests to the CommonJS build that Yoga's dependencies load.

**Some galleries show fewer works than asked for.** Many Met records have no Open Access image.
The server fetches twice the IDs it needs and drops works without one, which is usually but not
always enough; the gallery header then reads, for example, "11 shown".

**The cache and the rate limiter are per server instance.** On Vercel each function instance has
its own, so both blunt bursts rather than enforce a global quota. A shared store would change that
at the cost of a paid or extra service.

**`next dev` writes `AGENTS.md` and `CLAUDE.md`.** Next.js 16.2 and later add them when a coding
agent is detected. Both are gitignored.

**The Met's firewall blocks bursts.** The API sits behind Imperva, which answers a run of rapid
requests from one address with 403 Forbidden for a while. The client then stops calling the Met
for a minute rather than prolonging the block, and the gallery says the calls were refused. Heavy
local testing can trigger it; it clears on its own.

**The Met retires its v1 search on 1 October 2026.** Querated already uses the paginated v1.1
search. See [ADR 0003](docs/adr/0003-the-met-collection-api-through-v1-1-search.md).
