import { describe, expect, it, vi } from "vitest";
import { GRAPHQL_ENDPOINT, MAX_RESULT_COUNT, TRACE_EXTENSION } from "@/lib/contract";
import { buildQuery, DEFAULT_QUERY_OPTIONS } from "@/lib/query-builder";
import type { QueryTrace } from "@/lib/trace";
import { createMetClient } from "@/server/met/client";
import { createQueratedYoga } from "./yoga";

type Fixture = Record<string, unknown>;

function work(id: number, artist: string, withImage = true): Fixture {
  return {
    objectID: id,
    title: `Work ${id}`,
    objectDate: "1887",
    medium: "Oil on canvas",
    objectURL: `https://www.metmuseum.org/art/collection/search/${id}`,
    primaryImageSmall: withImage ? `https://images.metmuseum.org/web-large/${id}.jpg` : "",
    primaryImage: withImage ? `https://images.metmuseum.org/original/${id}.jpg` : "",
    artistDisplayName: artist,
    artistNationality: "Dutch",
    artistBeginDate: "1853",
    artistEndDate: "1890",
    departmentId: 11,
    isHighlight: id === 1,
    tags: [{ term: "Sunflowers" }],
  };
}

const OBJECTS = new Map<number, Fixture>([
  [1, work(1, "Vincent van Gogh")],
  [2, work(2, "Vincent van Gogh", false)],
  [3, work(3, "Vincent van Gogh")],
  [4, work(4, "Claude Monet")],
  [10, work(10, "Vincent van Gogh")],
  [11, work(11, "Vincent van Gogh")],
  [20, { ...work(20, ""), title: "Seated feline", tags: [{ term: "Animals" }] }],
  [21, { ...work(21, ""), title: "Faience amulet of a tree frog", tags: [{ term: "Frogs" }] }],
  [22, { ...work(22, ""), title: "Cat statuette", tags: [{ term: "Cats" }] }],
]);

const SEARCHES: Record<string, number[]> = {
  sunflowers: [1, 2, 3, 4, 404],
  "Vincent van Gogh": [1, 10, 11],
  "Claude Monet": [4],
  cats: [20, 21, 22],
};

function fakeMet(options: { failSearch?: boolean } = {}) {
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/search")) {
      if (options.failSearch) return new Response("unavailable", { status: 503 });
      const department = url.searchParams.get("departmentId");
      const highlight = url.searchParams.get("isHighlight") === "true";
      const q = url.searchParams.get("q") ?? "";
      const ids = (q === "*" ? [...OBJECTS.keys()] : (SEARCHES[q] ?? [])).filter((id) => {
        if (!department && !highlight) return true;
        const record = OBJECTS.get(id);
        if (department && record?.departmentId !== Number(department)) return false;
        return !highlight || record?.isHighlight === true;
      });
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return Response.json({ total: ids.length, objectIDs: ids.slice(offset, offset + limit) });
    }
    const id = Number(url.pathname.split("/").at(-1));
    const record = OBJECTS.get(id);
    return record
      ? Response.json(record)
      : Response.json({ message: "Not a valid object" }, { status: 404 });
  });
  return { fetch, met: createMetClient({ fetch }) };
}

async function execute(
  yoga: ReturnType<typeof createQueratedYoga>,
  query: string,
  variables: Record<string, unknown> = {},
) {
  const response = await yoga.fetch(`http://localhost${GRAPHQL_ENDPOINT}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return (await response.json()) as {
    data?: {
      artworks?: {
        total: number;
        items: Array<Record<string, unknown>>;
        pageInfo?: { startCursor: string; hasNextPage: boolean; endCursor: string | null };
      };
    } | null;
    errors?: Array<{ message: string; extensions?: { code?: string } }>;
    extensions?: Record<string, QueryTrace>;
  };
}

const everything = buildQuery({
  ...DEFAULT_QUERY_OPTIONS,
  first: MAX_RESULT_COUNT,
  artworkFields: [
    "date",
    "medium",
    "dimensions",
    "department",
    "culture",
    "creditLine",
    "image",
    "url",
  ],
  artistFields: ["nationality", "lifespan", "bio"],
  includeOtherWorks: true,
});

describe("the GraphQL API", () => {
  it("returns only works with an Open Access image, in the shape asked for", async () => {
    const { met } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(
      yoga,
      "query ($search: String!) { artworks(search: $search, first: 12) { total items { id title } } }",
      { search: "sunflowers" },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.artworks?.total).toBe(5);
    expect(result.data?.artworks?.items).toEqual([
      { id: "1", title: "Work 1" },
      { id: "3", title: "Work 3" },
      { id: "4", title: "Work 4" },
    ]);
  });

  it("accepts the largest query the studio can build", async () => {
    const { met } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(yoga, everything.text, { ...everything.variables });
    expect(result.errors).toBeUndefined();
  });

  it("searches each artist once, however many works share them", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    await execute(yoga, everything.text, { ...everything.variables });

    const artistSearches = fetch.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.searchParams.get("artistOrCulture") === "true")
      .map((url) => url.searchParams.get("q"));
    expect(artistSearches.sort()).toEqual(["Claude Monet", "Vincent van Gogh"]);
  });

  it("reports every upstream call, and serves repeats from the cache", async () => {
    const { met } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const query = "query ($search: String!) { artworks(search: $search) { items { id } } }";

    const first = (await execute(yoga, query, { search: "sunflowers" })).extensions?.[
      TRACE_EXTENSION
    ];
    expect(first?.upstream).toMatchObject({ total: 6, network: 6, cached: 0, failed: 1 });
    expect(first?.upstream.bytes).toBeGreaterThan(0);

    const second = (await execute(yoga, query, { search: "sunflowers" })).extensions?.[
      TRACE_EXTENSION
    ];
    expect(second?.upstream).toMatchObject({ total: 6, network: 0, cached: 6 });
  });

  it("names the filter that emptied a search, one Met search per combination", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(
      yoga,
      `query ($search: String!, $departmentId: Int, $highlightsOnly: Boolean) {
        artworks(search: $search, departmentId: $departmentId, highlightsOnly: $highlightsOnly) {
          total
          diagnosis { searchAlone filters { arguments matchesAlone matchesWithout } }
        }
      }`,
      { search: "sunflowers", departmentId: 99, highlightsOnly: true },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.artworks).toEqual({
      total: 0,
      diagnosis: {
        searchAlone: 5,
        filters: [
          { arguments: ["departmentId"], matchesAlone: 0, matchesWithout: 1 },
          { arguments: ["highlightsOnly"], matchesAlone: 1, matchesWithout: 0 },
        ],
      },
    });
    const searches = fetch.mock.calls.filter(([input]) => String(input).includes("/search"));
    expect(searches).toHaveLength(4);
  });

  it("spends nothing on the diagnosis when works came back", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(
      yoga,
      "query ($search: String!) { artworks(search: $search) { total diagnosis { searchAlone } } }",
      { search: "sunflowers" },
    );
    expect(result.data?.artworks).toEqual({ total: 5, diagnosis: null });
    const searches = fetch.mock.calls.filter(([input]) => String(input).includes("/search"));
    expect(searches).toHaveLength(1);
  });

  it("samples every work the filters allow when the search is empty", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(
      yoga,
      "query { artworks(departmentId: 11, first: 12) { total items { id } } }",
    );

    expect(result.data?.artworks?.total).toBe(9);
    expect(result.data?.artworks?.items.map((item) => item.id)).toEqual([
      "1",
      "3",
      "4",
      "10",
      "11",
      "20",
      "21",
      "22",
    ]);
    const searches = fetch.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith("/search"));
    expect(searches.map((url) => url.searchParams.get("q"))).toEqual(["*", "*"]);
  });

  it("keeps the search term in charge when filters are also set", async () => {
    const { met } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(
      yoga,
      'query { artworks(search: "Claude Monet", departmentId: 11) { items { id } } }',
    );
    expect(result.data?.artworks?.items).toEqual([{ id: "4" }]);
  });

  it("shows only works that visibly match the search, checking further batches to fill", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(
      yoga,
      'query { artworks(search: "cats", first: 1) { total items { title } } }',
    );

    expect(result.data?.artworks).toEqual({ total: 3, items: [{ title: "Cat statuette" }] });
    const objects = fetch.mock.calls.filter(([input]) => String(input).includes("/objects/"));
    expect(objects).toHaveLength(3);
  });

  it("pages through a search, each page starting where the last one stopped", async () => {
    const { met } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const query = `query ($after: String) {
      artworks(search: "sunflowers", first: 2, after: $after) {
        items { id }
        pageInfo { startCursor hasNextPage endCursor }
      }
    }`;

    const first = (await execute(yoga, query)).data?.artworks;
    expect(first?.items).toEqual([{ id: "1" }, { id: "3" }]);
    expect(first?.pageInfo?.hasNextPage).toBe(true);

    const second = (await execute(yoga, query, { after: first?.pageInfo?.endCursor })).data
      ?.artworks;
    expect(second?.items).toEqual([{ id: "4" }]);
    expect(second?.pageInfo).toMatchObject({ hasNextPage: false, endCursor: null });

    const again = (await execute(yoga, query, { after: first?.pageInfo?.startCursor })).data
      ?.artworks;
    expect(again?.items).toEqual(first?.items);
  });

  it("returns to the same random sample through its startCursor", async () => {
    const { met } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const query = `query ($after: String) {
      artworks(first: 2, after: $after) { items { id } pageInfo { startCursor } }
    }`;

    const sample = (await execute(yoga, query)).data?.artworks;
    const again = (await execute(yoga, query, { after: sample?.pageInfo?.startCursor })).data
      ?.artworks;
    expect(again?.items).toEqual(sample?.items);
  });

  it("refuses a cursor the server did not issue, or one past The Met's search window", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const query = 'query ($after: String) { artworks(search: "cats", after: $after) { total } }';
    const beyond = Buffer.from("offset:10000").toString("base64url");
    for (const after of ["offset:5", beyond]) {
      const result = await execute(yoga, query, { after });
      expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects arguments outside the published limits", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(yoga, 'query { artworks(search: "cats", first: 25) { total } }');
    expect(result.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("prices list sizes into the cost limit, so a huge page is refused unparsed", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(yoga, 'query { artworks(search: "cats", first: 5000) { total } }');
    expect(result.errors?.[0]?.message).toMatch(/cost limit/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects otherWorks nested inside otherWorks before calling The Met", async () => {
    const { met, fetch } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(
      yoga,
      `query { artworks(search: "sunflowers") { items { artist { otherWorks {
        artist { otherWorks { artist { name } } } } } } } }`,
    );
    expect(result.errors?.[0]?.message).toMatch(/depth limit/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps upstream detail out of errors, and in the trace of the failed call", async () => {
    const { met } = fakeMet({ failSearch: true });
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(yoga, 'query { artworks(search: "cats") { total } }');
    expect(result.errors?.[0]?.extensions?.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(JSON.stringify(result.errors)).not.toContain("503");
    expect(result.extensions?.[TRACE_EXTENSION]?.calls[0]?.failure).toEqual({
      url: expect.stringContaining("/v1.1/search?q=cats"),
      reason: "503 from the Met.",
    });
  });

  it("blocks introspection in production and allows it in development", async () => {
    const { met } = fakeMet();
    const query = "{ __schema { queryType { name } } }";
    const production = await execute(createQueratedYoga({ met, production: true }), query);
    const development = await execute(createQueratedYoga({ met, production: false }), query);
    expect(production.errors?.[0]?.message).toMatch(/introspection/i);
    expect(development.errors).toBeUndefined();
  });

  it("does not suggest field names to a caller who guesses wrong", async () => {
    const { met } = fakeMet();
    const yoga = createQueratedYoga({ met, production: true });
    const result = await execute(yoga, 'query { artworks(search: "cats") { totl } }');
    expect(result.errors?.[0]?.message).not.toMatch(/did you mean/i);
  });
});
