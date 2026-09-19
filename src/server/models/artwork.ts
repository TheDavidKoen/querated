// The domain model. Turns an untrusted Met object record into an Artwork, and is the only place
// that decides which upstream URLs may reach the browser.

import type { MetObject } from "@/server/met/types";

export type Artist = {
  name: string;
  bio: string | null;
  nationality: string | null;
  born: number | null;
  died: number | null;
  wikidataUrl: string | null;
  sourceArtworkId: string;
};

export type Artwork = {
  id: string;
  title: string;
  objectName: string | null;
  date: string | null;
  beginYear: number | null;
  endYear: number | null;
  medium: string | null;
  dimensions: string | null;
  department: string | null;
  culture: string | null;
  period: string | null;
  classification: string | null;
  creditLine: string | null;
  isHighlight: boolean;
  isPublicDomain: boolean;
  url: string;
  imageSmall: string | null;
  imageLarge: string | null;
  tags: string[];
  artist: Artist | null;
};

const MAX_TAGS = 8;

// Some Met titles carry inline markup such as <i>Pata</i>. Everything renders as plain text, so
// tags are dropped rather than shown.
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed.length > 0 ? trimmed : null;
}

function year(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  const raw = text(value);
  return raw !== null && /^-?\d{1,5}$/.test(raw) ? Number(raw) : null;
}

// Only URLs on these exact hosts, over https, are passed through. Everything else becomes null.
function httpsUrlOn(value: unknown, host: string): string | null {
  const raw = text(value);
  if (raw === null) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === host ? url.toString() : null;
  } catch {
    return null;
  }
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      const term =
        typeof entry === "object" && entry !== null
          ? text((entry as Record<string, unknown>).term)
          : null;
      return term === null ? [] : [term];
    })
    .slice(0, MAX_TAGS);
}

export function toArtwork(record: MetObject): Artwork {
  const id = String(record.objectID);
  const artistName = text(record.artistDisplayName);

  return {
    id,
    title: text(record.title) ?? text(record.objectName) ?? "Untitled",
    objectName: text(record.objectName),
    date: text(record.objectDate),
    beginYear: year(record.objectBeginDate),
    endYear: year(record.objectEndDate),
    medium: text(record.medium),
    dimensions: text(record.dimensions),
    department: text(record.department),
    culture: text(record.culture),
    period: text(record.period),
    classification: text(record.classification),
    creditLine: text(record.creditLine),
    isHighlight: record.isHighlight === true,
    isPublicDomain: record.isPublicDomain === true,
    url:
      httpsUrlOn(record.objectURL, "www.metmuseum.org") ??
      `https://www.metmuseum.org/art/collection/search/${id}`,
    imageSmall: httpsUrlOn(record.primaryImageSmall, "images.metmuseum.org"),
    imageLarge: httpsUrlOn(record.primaryImage, "images.metmuseum.org"),
    tags: tags(record.tags),
    artist:
      artistName === null
        ? null
        : {
            name: artistName,
            bio: text(record.artistDisplayBio),
            nationality: text(record.artistNationality),
            born: year(record.artistBeginDate),
            died: year(record.artistEndDate),
            wikidataUrl: httpsUrlOn(record.artistWikidata_URL, "www.wikidata.org"),
            sourceArtworkId: id,
          },
  };
}

export function hasImage(artwork: Artwork | null | Error): artwork is Artwork {
  return artwork !== null && !(artwork instanceof Error) && artwork.imageSmall !== null;
}
