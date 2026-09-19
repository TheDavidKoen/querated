import { describe, expect, it } from "vitest";
import { type Artwork, toArtwork } from "./artwork";
import { matchesTerm, words } from "./search-match";

function artwork(fields: Record<string, unknown>): Artwork {
  return toArtwork({ objectID: 1, ...fields });
}

describe("words", () => {
  it("lowercases, strips accents and splits on punctuation", () => {
    expect(words("Cats, Dogs and Glass")).toEqual(["cats", "dogs", "and", "glass"]);
    expect(words("Café (Crèmes)")).toEqual(["cafe", "cremes"]);
  });
});

describe("matchesTerm", () => {
  it("matches a plural search against a singular title", () => {
    expect(matchesTerm(artwork({ title: "Cat Statuette" }), "cats")).toBe(true);
  });

  it("matches on subject tags, artist, object type and classification", () => {
    expect(matchesTerm(artwork({ title: "Plate", tags: [{ term: "Cats" }] }), "cat")).toBe(true);
    expect(matchesTerm(artwork({ artistDisplayName: "Katsushika Hokusai" }), "Hokusai")).toBe(true);
    expect(matchesTerm(artwork({ title: "Rattle", objectName: "Cat sistrum" }), "cats")).toBe(true);
    expect(matchesTerm(artwork({ classification: "Arms and Armor" }), "armor")).toBe(true);
  });

  it("rejects works that only matched text the API does not return", () => {
    const frog = artwork({
      title: "Faience amulet in the form of a tree frog",
      medium: "Faience",
      tags: [{ term: "Frogs" }],
    });
    expect(matchesTerm(frog, "cats")).toBe(false);
  });

  it("matches plurals either way without breaking words ending in ss", () => {
    expect(matchesTerm(artwork({ title: "House" }), "houses")).toBe(true);
    expect(matchesTerm(artwork({ title: "Box" }), "boxes")).toBe(true);
    expect(matchesTerm(artwork({ title: "Dogs at Play" }), "dog")).toBe(true);
    expect(matchesTerm(artwork({ title: "Glass" }), "glass")).toBe(true);
  });

  it("needs every word of a multi-word search", () => {
    const bowl = artwork({ title: "Tea bowl", medium: "Stoneware" });
    expect(matchesTerm(bowl, "tea bowl")).toBe(true);
    expect(matchesTerm(bowl, "tea cup")).toBe(false);
  });

  it("does not match a word inside a longer word", () => {
    expect(matchesTerm(artwork({ title: "Dogon figure" }), "dog")).toBe(false);
  });
});
