# 0011. Cursor pagination over Met positions

**Status:** Accepted · 2026-09-19

## Context

A search used to return one page of up to 24 works and stop there. Visitors want to browse past
it. Numbered pages are the obvious model, but they need to know where page 7 starts, and
Querated cannot know that without checking every work before it: The Met's IDs pass through the
Open Access image check and the visible-match check (ADR 0010), and neither can be counted
ahead of time.

## Decision

`artworks` takes an `after` argument and returns `pageInfo { startCursor hasNextPage endCursor }`,
the pagination shape GraphQL clients already know.

A cursor is an opaque, base64url-encoded position in The Met's search results. A page checks IDs
from its position until it holds `first` works, and its `endCursor` points just past the last
work it kept, so no work is skipped or repeated between pages. The server accepts only cursors it
could have issued, and refuses any other value before calling The Met.

Every page, with or without a search term, checks up to three batches of twice the page size
before it settles for fewer works. The studio offers Previous and Next. It keeps the
`startCursor` of each page it leaves, so Previous returns to exactly the same works, including
the random sample an empty search starts from.

## Rationale

A position-based cursor makes every page cost the same, whatever its number. Page 20 checks no
more IDs than page 1, and never has to replay pages 1 to 19 to find its start.

The cursor stays opaque so its format can change without breaking clients, and validating it
strictly keeps a hand-written value from reaching The Met.

## Consequences

- There are no page numbers to jump to and no page count. The gallery shows the current page, and Next is offered while The Met has further results.
- A page can hold fewer works than `first` when few of the IDs checked match visibly. The gallery says so, and Next carries on from where that page stopped.
- A cursor is only meaningful with the arguments that produced it. Used with others, it simply starts from that position.
- Pages end at The Met's v1.1 search window of 10,000 results (ADR 0003).
- Filling a short page can cost up to three batches of object calls: 72 for a page of 24. The concurrency limit and the cache still apply.
