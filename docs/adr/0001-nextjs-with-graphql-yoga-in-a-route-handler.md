# 0001. Next.js with GraphQL Yoga in a route handler

**Status:** Accepted · 2026-09-18

## Context

Querated needs a browser studio with heavy client-side motion, a GraphQL server in front of a
REST API, server-rendered HTML for search engines, and a free host. The framework was chosen up
front: Next.js. The open question was how to host the GraphQL server inside it.

## Decision

Next.js 16 with the App Router. The GraphQL server is GraphQL Yoga, mounted as a route handler at
`src/app/api/graphql/route.ts`, with a schema written in SDL and resolvers in TypeScript.

## Rationale

Yoga is built on the Fetch API, which is exactly what App Router route handlers speak, so the
integration is one function call with no adapter. It is maintained by The Guild, who also
maintain Envelop, the plugin system GraphQL Armor and the trace plugin plug into.

Apollo Server would work too, through an integration package, but it brings more than a
read-only API needs. A separate API service would mean a second deployable and a
second host for one endpoint.

SDL over a code-first builder: the schema is the thing this project exists to show, and SDL is
the form a reader can take in at a glance. Type safety comes from the tests instead: every query
the studio can build is validated against the SDL in `query-builder.test.ts`.

## Consequences

- One deployable, one host, one origin, so no CORS configuration at all.
- The server bundle carries graphql, Yoga and their dependencies. None of it reaches the browser, and the budget script checks that.
- Resolver argument types are written by hand rather than generated. The schema tests catch drift between the SDL and the studio, not between the SDL and the resolvers.
- graphql is held on 16.x, see ADR 0005.
