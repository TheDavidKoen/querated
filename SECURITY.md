# Security

## Reporting a vulnerability

Report privately through GitHub: the repository's **Security** tab, then **Report a
vulnerability**. Please do not open a public issue.

Only the version deployed from `main` is supported.

## What the application can do

Querated is a read-only proxy over a public API. It has no accounts, no database, no cookies, no
secrets and no write operations. Its one endpoint, `POST /api/graphql`, reads from The Met
Collection API and nothing else.

## Protections

| Layer | Protection | Where |
|---|---|---|
| Transport | Requests over 8 KB refused before parsing | `src/app/api/graphql/route.ts` |
| Transport | 20 requests a minute per client address, per server instance | `src/server/rate-limit.ts` |
| Transport | POST only in production; GET answers 405 | `src/app/api/graphql/route.ts` |
| Transport | No CORS headers, so other sites cannot call the API from a browser | `src/server/graphql/yoga.ts` |
| Query | Depth, cost, alias, directive and token limits, enforced before execution | `src/server/graphql/plugins.ts` |
| Query | Introspection and field suggestions off in production; batching off | `src/server/graphql/yoga.ts` |
| Arguments | Range and length checks on every argument before The Met is called | `src/server/graphql/resolvers.ts` |
| Errors | Unexpected errors masked; only deliberate messages reach clients | `src/server/graphql/yoga.ts` |
| Upstream | Concurrency limit and timeout on every call to The Met | `src/server/met/client.ts` |
| Upstream | Met records type-checked; URLs pass only on allowlisted hosts over `https` | `src/server/models/artwork.ts` |
| Browser | Nonce-based Content Security Policy with `strict-dynamic`, per request | `src/proxy.ts` |
| Browser | HSTS, `nosniff`, frame denial, strict referrer policy, permissions policy | `next.config.ts` |
| Browser | Images from The Met load with no referrer | `src/components/ArtworkCard.tsx` |
| Bundle | Build fails if server code or source maps reach the browser | `scripts/check-budget.ts` |

On every pull request, `pnpm test` exercises the query limits, argument checks, error masking,
introspection and suggestion blocking, the concurrency limit, the rate limiter and the URL
allowlist; `pnpm run budget` enforces the bundle row; and Lighthouse audits the served page,
including its Content Security Policy.

## Privacy

Querated sets no cookies, runs no analytics and stores nothing about visitors. Searches travel in
POST bodies, so they never appear in URLs, browser history or access logs. The rate limiter holds
a client address in memory for one minute and never writes it anywhere. Fonts are self-hosted, so
no third party sees a visit; images load from `images.metmuseum.org` without a referrer.

## Supply chain

- pnpm's minimum release age keeps versions published within the last day out of the lockfile
- Dependency build scripts run only when allowed by name in `pnpm-workspace.yaml`; none are
- CI installs with `--frozen-lockfile`, runs with a read-only token, does not persist checkout credentials, and fails on high or critical advisories in production dependencies
- GitHub Actions are pinned to commit SHAs, and Dependabot keeps them and the npm dependencies current
- No deploy credential exists in this repository: Vercel deploys through its own GitHub integration
