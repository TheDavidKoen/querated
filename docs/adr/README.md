# Architecture decision records

One file per decision, numbered in the order taken. Each records the context, what was decided,
and what it costs.

| # | Decision | Status |
|---|---|---|
| [0001](0001-nextjs-with-graphql-yoga-in-a-route-handler.md) | Next.js with GraphQL Yoga in a route handler | Accepted |
| [0002](0002-github-flow.md) | GitHub Flow, branches deleted after merge | Accepted |
| [0003](0003-the-met-collection-api-through-v1-1-search.md) | The Met Collection API, through v1.1 search | Accepted |
| [0004](0004-request-scoped-dataloader-over-shared-cache.md) | Request-scoped DataLoader over a shared cache | Accepted |
| [0005](0005-query-hardening-before-execution.md) | Query hardening before execution | Accepted |
| [0006](0006-nonce-based-content-security-policy.md) | Nonce-based Content Security Policy | Accepted |
| [0007](0007-gsap-for-choreography-three-js-for-the-beam.md) | GSAP for choreography, Three.js for the beam | Accepted |
| [0008](0008-vercel-through-its-git-integration.md) | Vercel through its Git integration | Accepted |
| [0009](0009-met-images-served-unoptimised.md) | Met images served unoptimised | Accepted |
| [0010](0010-search-terms-must-visibly-match.md) | Search terms must visibly match | Accepted |

Superseded records stay in place with their status changed, rather than being deleted.

0003, 0004, 0005, 0006 and 0010 are enforced by tests, the budget script or Lighthouse rather than by
review.
