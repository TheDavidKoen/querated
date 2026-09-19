# 0010. Search terms must visibly match

**Status:** Accepted · 2026-09-18

## Context

The Met's search matches a term anywhere in its catalogue data, including text the API never
returns, such as the essays on its website. Measured on 2026-09-18, `cats` between -500 and 300
returned 32 works. They included a faience frog amulet, a terracotta oil lamp, shears and four
mace heads, none of which carries the word in any field a visitor can see. To a visitor, the
search looks ignored.

## Decision

A work is shown only when every word of the search term appears in its title, object type,
subject tags, artist, culture, medium or classification. Matching ignores case and accents, and
treats plurals and singulars as the same word, so `cats` finds "Cat" and `houses` finds
"House", while `dog` does not find "Dogon". An empty search skips the check.

Because the check drops IDs after they are fetched, a search asks The Met for up to three
batches of IDs, each twice the page size, and loads further batches only until the page is full.

## Rationale

The term is the visitor's intent. Filters only narrow it, and a result nobody can connect to
the term undermines the whole gallery. Every field checked is one the Met publishes with the
work. Subjects often carry a match the title does not, such as a cigarette card tagged
Sunflowers, so the studio selects them by default and the card shows them.

The check runs on data already loaded to build the cards, so it costs no extra calls when the
first batch fills the page.

## Consequences

- Some works The Met considers relevant are hidden, such as a "Seated feline" tagged only "Animals" for `cats`. That is the intended trade.
- `total` remains The Met's own count and can exceed what `items` reaches. The gallery header shows both.
- A term with few visible matches can cost up to three times the object calls of a full first batch: 72 for a page of 24. The concurrency limit and cache still apply.
- Synonyms are not matched: `feline` finds "Feline Bottle" but not "Cat Statuette".
