# 0003. The Met Collection API, through v1.1 search

**Status:** Accepted · 2026-09-18

## Context

The project needs a free art API with a large collection, rich records and images. The candidates
were The Met, the Art Institute of Chicago, the Cleveland Museum of Art, Harvard Art Museums and
Paris Musées. Artsy's public API is being retired and was ruled out.

The Met's API needs no key, publishes over 470,000 records under CC0 and asks for no more than 80
requests a second. Its weakness is that search returns object IDs only, one call per record
after that.

The Met deprecated `/v1/search` on 2026-09-04 and retires it on 2026-10-01. Its replacement,
`/v1.1/search`, takes the same filters plus `offset` and `limit`, defaults to 100 results and
caps `offset + limit` at 10,000.

## Decision

The Met is the only data source. Searches use `/v1.1/search` with an explicit `limit`; objects
and departments use `/v1/objects/{id}` and `/v1/departments`. Searches always set
`hasImages=true`, and the API returns only works that carry an Open Access image.

## Rationale

IDs-only search is a cost for a REST client and exactly the problem GraphQL with DataLoader is
meant to solve, so the weakness is the demonstration. No key means no secret to store, rotate or
leak. One source keeps the schema honest: every field maps to something The Met actually
publishes.

`hasImages=true` still returns works whose images are withheld for rights reasons; for those,
`primaryImageSmall` is an empty string. A gallery of blank frames would misrepresent the
collection, so the resolver drops them and over-fetches IDs to compensate.

## Consequences

- A gallery of twelve costs a search plus up to twenty-four object calls, which is why caching and a concurrency limit exist, see ADR 0004.
- A search can show fewer works than asked for when too many matches lack an image.
- The search term is never dropped: it and every filter are sent together, so The Met returns only works that satisfy all of them. With no term the query uses `q=*`, which The Met treats as every object.
- The Met returns `q=*` results in the same order every time, so an empty search first counts the matches with a `limit=1` search, then reads from a random offset inside the first 10,000 that v1.1 can reach. Each send brings a different selection, for one extra search.
- If The Met changes its API again, `src/server/met/client.ts` is the only file that builds its URLs.
- Data and images are used under The Met's terms and credited in the README.
