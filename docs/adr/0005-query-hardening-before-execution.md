# 0005. Query hardening before execution

**Status:** Accepted · 2026-09-18

## Context

The studio sends arbitrary GraphQL documents, because showing the query is the point. Anyone can
send the same endpoint a document of their own. `otherWorks` returns `Artwork`, which has an
`artist`, which has `otherWorks`, so a hand-written query could nest the most expensive field
until the server spends minutes calling The Met.

## Decision

Reject expensive operations before any resolver runs, then validate arguments before any
upstream call.

- **GraphQL Armor** as an Envelop plugin: depth 6, cost 1,500, 4 aliases, 8 directives, 600
  tokens, and field suggestions blocked.
- **Resolvers** check every argument against the limits in `src/lib/contract.ts` and throw
  `BAD_USER_INPUT` before touching The Met.
- **Yoga**: batching off, CORS off, error masking on, and in production introspection off
  through graphql's `NoSchemaIntrospectionCustomRule`, and GraphiQL off.
- **The route**: an 8 KB body cap and a 20-per-minute budget per client address, both checked
  before Yoga parses the body, and POST only in production.

## Rationale

Depth 6 fits the deepest query the studio builds, `artworks > items > artist > otherWorks >
field`, and rejects `otherWorks` nested inside `otherWorks`. Armor's cost analysis multiplies by
list-size arguments such as `first`, so a single query asking for thousands of items is refused
unparsed; 1,500 clears the largest studio query at `first: 24` with every field, which
`yoga.test.ts` asserts.

Introspection is off because the schema is published in the repository; a production endpoint
does not need to hand out its own map. Error masking means a failure inside a resolver reaches
the client as "Unexpected error." rather than a stack or an upstream status.

POST only keeps search terms out of URLs, browser history and access logs.

GraphQL Armor depends on graphql 16, and two copies of graphql cannot share one schema, so the
project stays on graphql 16 until Armor moves.

## Consequences

- The Armor limits, argument checks, error masking and introspection rule are exercised by `yoga.test.ts`, and the rate limiter by `rate-limit.test.ts`. The body cap and the POST-only rule live in the route handler and were checked against a production build.
- The rate limiter is per instance, so it blunts bursts rather than enforcing a global quota.
- A hand-written query that is legitimate but deeper than 6 is refused. That is the intended trade.
- graphql 17 waits on GraphQL Armor; Dependabot ignores the major version.
