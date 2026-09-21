# Changelog

All notable changes to Querated are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Cursor pagination: `after` and `pageInfo` on `artworks`, with Previous and Next in the gallery
- The exact request and failure reason for every failed upstream call, shown in a bubble on hover or focus
- The dock: a tech stack sheet with the reason and ADR behind each choice, and a link back to my site

### Changed

- Every page checks up to three batches before settling for fewer works, with or without a search term
- The new Querated mark in the favicon, the Apple touch icon and the share image

## [0.1.0] - 2026-09-18

### Added

- The studio: search, filters and field choices that write a GraphQL query live, sent with a token flight and a particle beam across the screen
- The gallery, built from the response in exactly the shape of the query
- Behind the scenes: every upstream call, cache hits, server time and a fan-out diagram, carried in the response's `extensions`
- The payload meter, comparing GraphQL bytes with the raw Met JSON the same works cost
- Optional search: leave it empty for a random selection of every work the filters allow
- Visible matching: every result shows the search term in its title, subjects, artist or other listed fields
- `ArtworkResults.diagnosis` and the "Why nothing matched" panel, naming the filter that emptied a search and clearing it in one click
- A one-minute backoff whenever the Met's firewall refuses calls
- A GraphQL API over The Met Collection API with request-scoped DataLoaders, a shared cache, GraphQL Armor limits, rate limiting and a nonce-based Content Security Policy
