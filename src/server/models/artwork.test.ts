import { describe, expect, it } from "vitest";
import type { MetObject } from "@/server/met/types";
import { hasImage, toArtwork } from "./artwork";

const sunflowers: MetObject = {
  objectID: 436524,
  title: "Sunflowers",
  objectDate: "1887",
  objectBeginDate: 1887,
  objectEndDate: 1887,
  medium: "Oil on canvas",
  department: "European Paintings",
  isHighlight: true,
  isPublicDomain: true,
  objectURL: "https://www.metmuseum.org/art/collection/search/436524",
  primaryImageSmall: "https://images.metmuseum.org/CRDImages/ep/web-large/DP-41223-001.jpg",
  primaryImage: "https://images.metmuseum.org/CRDImages/ep/original/DP-41223-001.jpg",
  artistDisplayName: "Vincent van Gogh",
  artistDisplayBio: "Dutch, Zundert 1853–1890 Auvers-sur-Oise",
  artistNationality: "Dutch",
  artistBeginDate: "1853",
  artistEndDate: "1890",
  artistWikidata_URL: "https://www.wikidata.org/wiki/Q5582",
  culture: "",
  tags: [{ term: "Sunflowers" }, { term: "Still Life" }, { nope: true }],
};

describe("toArtwork", () => {
  it("normalises a public domain painting", () => {
    const artwork = toArtwork(sunflowers);
    expect(artwork).toMatchObject({
      id: "436524",
      title: "Sunflowers",
      date: "1887",
      beginYear: 1887,
      culture: null,
      isHighlight: true,
      imageSmall: sunflowers.primaryImageSmall,
      tags: ["Sunflowers", "Still Life"],
      artist: {
        name: "Vincent van Gogh",
        nationality: "Dutch",
        born: 1853,
        died: 1890,
        sourceArtworkId: "436524",
      },
    });
    expect(hasImage(artwork)).toBe(true);
  });

  it("treats empty image strings as no image", () => {
    const artwork = toArtwork({ ...sunflowers, primaryImageSmall: "", primaryImage: "" });
    expect(artwork.imageSmall).toBeNull();
    expect(hasImage(artwork)).toBe(false);
  });

  it("never passes through URLs on other hosts or over plain http", () => {
    const artwork = toArtwork({
      ...sunflowers,
      primaryImageSmall: "https://evil.example/pixel.gif",
      primaryImage: "http://images.metmuseum.org/original.jpg",
      objectURL: "javascript:alert(1)",
      artistWikidata_URL: "https://wikidata.evil.example/Q1",
    });
    expect(artwork.imageSmall).toBeNull();
    expect(artwork.imageLarge).toBeNull();
    expect(artwork.url).toBe("https://www.metmuseum.org/art/collection/search/436524");
    expect(artwork.artist?.wikidataUrl).toBeNull();
  });

  it("survives fields of the wrong type", () => {
    const artwork = toArtwork({
      objectID: 1,
      title: 42,
      objectName: "Vase",
      artistBeginDate: "ca. 1600",
      tags: "not a list",
    });
    expect(artwork.title).toBe("Vase");
    expect(artwork.artist).toBeNull();
    expect(artwork.tags).toEqual([]);
  });

  it("drops inline markup from Met text", () => {
    const artwork = toArtwork({ ...sunflowers, title: "Hilt of a Gauntlet Sword (<i>Pata</i>)" });
    expect(artwork.title).toBe("Hilt of a Gauntlet Sword (Pata)");
  });

  it("falls back to Untitled", () => {
    expect(toArtwork({ objectID: 2 }).title).toBe("Untitled");
  });
});
