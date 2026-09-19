import { buildSchema, parse, validate } from "graphql";
import { describe, expect, it } from "vitest";
import { typeDefs } from "@/server/graphql/type-defs";
import {
  ARTIST_FIELDS,
  ARTWORK_FIELDS,
  type ArtistField,
  type ArtworkField,
  buildQuery,
  DEFAULT_QUERY_OPTIONS,
  type QueryOptions,
} from "./query-builder";

const schema = buildSchema(typeDefs);

function subsets<T>(items: readonly T[]): T[][] {
  return items.reduce<T[][]>(
    (all, item) => all.flatMap((subset) => [subset, [...subset, item]]),
    [[]],
  );
}

function errorsFor(options: QueryOptions): string[] {
  const built = buildQuery(options);
  return validate(schema, parse(built.text)).map((error) => error.message);
}

describe("buildQuery", () => {
  it("builds a valid document for every combination of artwork fields", () => {
    for (const artworkFields of subsets<ArtworkField>(ARTWORK_FIELDS.map((field) => field.key))) {
      expect(errorsFor({ ...DEFAULT_QUERY_OPTIONS, artworkFields })).toEqual([]);
    }
  });

  it("builds a valid document for every combination of artist options", () => {
    for (const artistFields of subsets<ArtistField>(ARTIST_FIELDS.map((field) => field.key))) {
      for (const includeArtist of [true, false]) {
        for (const includeOtherWorks of [true, false]) {
          const options = {
            ...DEFAULT_QUERY_OPTIONS,
            artistFields,
            includeArtist,
            includeOtherWorks,
          };
          expect(errorsFor(options)).toEqual([]);
        }
      }
    }
  });

  it("builds a valid document with every filter set", () => {
    const options: QueryOptions = {
      ...DEFAULT_QUERY_OPTIONS,
      departmentId: 11,
      from: -500,
      to: 1900,
      highlightsOnly: true,
    };
    expect(errorsFor(options)).toEqual([]);
  });

  it("turns each filter into a variable and an argument", () => {
    const built = buildQuery({ ...DEFAULT_QUERY_OPTIONS, departmentId: 11, from: 1400 });
    expect(built.text).toContain("$departmentId: Int");
    expect(built.text).toContain("departmentId: $departmentId");
    expect(built.text).toContain("from: $from");
    expect(built.text).not.toContain("$to");
    expect(built.variables).toEqual({
      search: DEFAULT_QUERY_OPTIONS.search,
      departmentId: 11,
      from: 1400,
      first: DEFAULT_QUERY_OPTIONS.first,
    });
  });

  it("never writes user input into the document text", () => {
    const hostile = 'x") { __schema { types { name } } } #';
    const built = buildQuery({ ...DEFAULT_QUERY_OPTIONS, search: hostile });
    expect(built.text).not.toContain("__schema");
    expect(built.variables.search).toBe(hostile);
  });

  it("keeps the rendered tokens identical to the document text", () => {
    const built = buildQuery({ ...DEFAULT_QUERY_OPTIONS, includeOtherWorks: true });
    const rendered = built.lines
      .map((line) => "  ".repeat(line.depth) + line.tokens.map((token) => token.text).join(""))
      .join("\n");
    expect(rendered).toBe(built.text);
  });

  it("selects the diagnosis only when asked, and stays valid either way", () => {
    for (const explainEmpty of [true, false]) {
      const options = { ...DEFAULT_QUERY_OPTIONS, departmentId: 4, explainEmpty };
      expect(errorsFor(options)).toEqual([]);
      expect(buildQuery(options).text.includes("diagnosis")).toBe(explainEmpty);
    }
  });

  it("leaves the search argument out when the search is empty", () => {
    const built = buildQuery({ ...DEFAULT_QUERY_OPTIONS, search: "  ", departmentId: 4 });
    expect(built.text).not.toContain("$search");
    expect(built.text).not.toContain("search:");
    expect(built.variables).toEqual({ departmentId: 4, first: DEFAULT_QUERY_OPTIONS.first });
    expect(errorsFor({ ...DEFAULT_QUERY_OPTIONS, search: "" })).toEqual([]);
  });

  it("only selects otherWorks inside artist", () => {
    const built = buildQuery({
      ...DEFAULT_QUERY_OPTIONS,
      includeArtist: false,
      includeOtherWorks: true,
    });
    expect(built.text).not.toContain("otherWorks");
  });
});
