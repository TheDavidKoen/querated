import { describe, expect, it, vi } from "vitest";
import { TraceRecorder } from "@/server/trace-recorder";
import { createMetClient, MetUnavailableError } from "./client";

describe("createMetClient", () => {
  it("stops calling the Met for a while after it refuses a call", async () => {
    const fetch = vi.fn(
      async (_input: string | URL | Request) => new Response("", { status: 403 }),
    );
    const met = createMetClient({ fetch });
    const trace = new TraceRecorder();

    await expect(met.object(1, trace)).rejects.toBeInstanceOf(MetUnavailableError);
    await expect(met.object(2, trace)).rejects.toBeInstanceOf(MetUnavailableError);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(trace.summary().upstream).toMatchObject({ total: 2, failed: 2 });
  });

  it("builds the search URL and the trace label from the same parameters", async () => {
    const fetch = vi.fn(async (_input: string | URL | Request) =>
      Response.json({ total: 0, objectIDs: null }),
    );
    const met = createMetClient({ fetch });
    const trace = new TraceRecorder();

    await met.search(
      { q: "cats", hasImages: true, limit: 24, departmentId: 4, isHighlight: true },
      trace,
    );

    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=cats&departmentId=4&isHighlight=true&hasImages=true&limit=24",
    );
    expect(trace.summary().calls[0]?.label).toBe('"cats" departmentId=4 isHighlight');
  });
});
