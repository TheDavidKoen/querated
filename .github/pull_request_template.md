## What

Brief description of the change.

## Why

The problem this solves, or the decision behind it. Link an ADR if one applies.

## Checks

- [ ] `pnpm verify` clean
- [ ] Any new field or argument is added to the schema, the resolvers and the query builder together, and `pnpm test` still validates every studio query against the schema
- [ ] Any new upstream call goes through `src/server/met/client.ts`, so it is cached, limited and traced
- [ ] Checked at phone, laptop and wide viewports
- [ ] Send checked with reduced motion enabled
- [ ] Keyboard path checked: every control reachable, focus ring visible
- [ ] No new third-party origin, or the Content Security Policy in `src/proxy.ts` and ADR 0006 updated together

## Screenshots

Before and after, for any visible change.

## Notes

Anything a reviewer should look at closely, or a known trade-off being accepted.
