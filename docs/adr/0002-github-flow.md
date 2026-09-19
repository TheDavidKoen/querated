# 0002. GitHub Flow, branches deleted after merge

**Status:** Accepted · 2026-09-18

## Context

Solo project with no release trains. Production deploys from `main` on every merge.

## Decision

GitHub Flow: `main` always deployable, short-lived `feat/`, `fix/`, `chore/`, `docs/` and
`refactor/` branches merged via squashed pull request. Branches are deleted once merged. `main` is
protected and requires the `Verify` check.

## Rationale

The `develop` and `release` layers of heavier models exist to coordinate versioned releases
across teams. Adopting them for one maintainer would be ceremony without a purpose.

Merged branches are deleted because a branch is a workspace, not storage. The commits stay
reachable from `main`, and GitHub keeps merged pull requests and their diffs. Stale branches
invite work from an outdated base.

## Consequences

- Every change is reviewable as a self-contained diff, with a Vercel preview to try.
- The pull request trail is the durable record, not the branch list.
- A merged branch is spent. Further work starts a new one.
