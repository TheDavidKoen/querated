# 0008. Vercel through its Git integration

**Status:** Accepted · 2026-09-18

## Context

The host must be free, run Next.js 16 with route handlers and `proxy.ts` as designed, give every
pull request a preview, and keep deployment credentials out of GitHub.

Cloudflare would match the other projects in this portfolio, but running Next.js there means the
OpenNext adapter, a translation layer between the framework and the platform that neither side
maintains as its first concern.

## Decision

Vercel's Hobby plan, deployed through Vercel's own GitHub integration: production from `main`, a
preview per pull request. No deploy job in GitHub Actions and no Vercel token in repository
secrets.

## Rationale

Vercel builds Next.js natively, so what runs in production is what `next build` produced, with
nothing in between. The Git integration means the only credential lives in Vercel's GitHub app,
installed with access to this one repository. Hobby is free for personal, non-commercial projects,
which this is. Vercel overwrites `x-forwarded-for` with the connecting address, which is what
makes the rate limiter's client key trustworthy there.

## Consequences

- Deployments are not gated by CI inside Vercel. `main` is protected by the `Verify` check instead, so nothing reaches `main` untested.
- Hobby limits apply: 4 active CPU hours and 1 million function invocations a month, among others. A portfolio's traffic sits far below them.
- Hobby is non-commercial. A commercial use would mean the Pro plan or another host.
- Moving hosts is a configuration change: nothing in the code depends on Vercel beyond reading `VERCEL_PROJECT_PRODUCTION_URL` for the canonical address.
