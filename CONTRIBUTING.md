# Contributing

## Branching

`main` is always deployable. Work happens on short-lived branches merged via pull request.

`main` is protected. Every change arrives through a pull request, the `Verify` check must pass
on a branch that is up to date with `main`, and review conversations must be resolved. Pull
requests are squash merged, so the pull request title becomes the commit subject and must follow
the commit format below. Force pushes and deletions are blocked.

| Prefix | For |
|---|---|
| `feat/` | New fields, arguments, filters or studio behaviour |
| `fix/` | Something wrong, broken or inaccessible |
| `chore/` | Tooling, dependencies, config |
| `docs/` | Documentation only |
| `refactor/` | Restructuring without changing behaviour |

Branches are deleted once merged. See [ADR 0002](docs/adr/0002-github-flow.md). A merged branch
is spent: further work starts a fresh branch off `main`.

```sh
git checkout main
git pull
git checkout -b feat/thing
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org/). One short subject in the
imperative, under about 70 characters, naming the kind of change rather than listing every edit.
Authorship is visible on GitHub, so no author or co-author lines.

```
feat: add a culture filter
docs: update the documentation
```

## Before opening a pull request

```sh
pnpm verify
```

That runs the type check, Biome, the tests, the production build and the performance budget. All
must be clean. CI runs the same steps, then Lighthouse, so a red check means one of them failed.
Reproduce it locally rather than pushing again to see.

Then check by eye with `pnpm build` and `pnpm start`, which serves the real Content Security
Policy:

- A send with the default query, one with every field and `otherWorks`, and one that matches nothing
- The same at phone, laptop and wide widths
- A send with reduced motion enabled in the operating system
- The browser console, which must stay empty

## Code conventions

**The schema, the resolvers and the query builder change together.** A new field or argument
goes into `type-defs.ts`, `resolvers.ts` to validate it, `src/server/services/` where it needs
logic, and `query-builder.ts` if the studio can select it. `query-builder.test.ts` validates every
query the studio can build against the schema, so a mismatch fails the tests.

**Limits live in `src/lib/contract.ts`.** The server enforces them and the studio reads them. Do
not restate a number anywhere else.

**Every upstream call goes through `src/server/met/client.ts`.** That is where caching, the
concurrency limit, the timeout and the trace live. A direct `fetch` to The Met would bypass all
four.

**Upstream data is untrusted.** Met records are read through `src/server/models/artwork.ts`,
which checks every field's type and passes URLs through only on an allowlisted host over `https`.

**Components never import from `src/server/`.** The studio reaches the server through
`/api/graphql` only. The budget script fails the build if the Met API host reaches a client
bundle.

**Motion is optional.** Every animation checks `useReducedMotion`, and the studio must work in
full without GSAP timelines or WebGL running.

**Comments mark important files and important lines only.** A file that carries weight opens with
a header naming what it does. Beyond that, a comment is only for a line that would be unsafe to
change without it. Rationale belongs in an ADR.

**No emojis or em dashes anywhere in the repository**, including Markdown, commit messages and
pull request bodies.

**Filenames are lowercase kebab-case**, except React components, which are PascalCase by React
convention, and names a tool requires verbatim: `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`,
`SECURITY.md`, `LICENSE`, and Next.js file conventions such as `page.tsx` and `route.ts`.

## Releasing

Versions follow [Semantic Versioning](https://semver.org/). A `fix` is a patch, a `feat` is a
minor version, and anything that removes or renames a field or argument in the public schema is a
major version.

One pull request bumps `version` in `package.json` and adds the `CHANGELOG.md` entry, titled
`chore: release 0.2.0`. After it merges, tag `main`:

```sh
git tag v0.2.0
git push origin v0.2.0
```

## Recording a decision

Anything a future reader would otherwise reverse by accident gets an ADR in `docs/adr/`,
numbered in sequence and following the existing format. Superseded records stay in place with
their status changed.
