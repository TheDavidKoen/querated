// Decides whether a work visibly matches a search term. The Met's search also matches text the API
// never returns, such as catalogue essays, so its results can include works with no visible link
// to the term. Querated shows a work only when every word of the term appears in a field the Met
// publishes with the work, all of which the card can show. See ADR 0010.

import type { Artwork } from "./artwork";

// A word and its likely singulars, so "cats" finds "Cat", "boxes" finds "Box" and "houses" finds
// "House", while "glass" stays whole.
function forms(word: string): string[] {
  const found = [word];
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) found.push(word.slice(0, -1));
  if (word.length > 4 && word.endsWith("es")) found.push(word.slice(0, -2));
  return found;
}

export function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function searchable(artwork: Artwork): Set<string> {
  const fields = [
    artwork.title,
    artwork.objectName,
    artwork.artist?.name,
    artwork.culture,
    artwork.medium,
    artwork.classification,
    ...artwork.tags,
  ];
  return new Set(fields.flatMap((field) => (field ? words(field).flatMap(forms) : [])));
}

export function matchesTerm(artwork: Artwork, term: string): boolean {
  const wanted = words(term);
  if (wanted.length === 0) return true;
  const available = searchable(artwork);
  return wanted.every((word) => forms(word).some((form) => available.has(form)));
}
