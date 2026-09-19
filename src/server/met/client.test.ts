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

  it("records the exact request and the reason for every failed call", async () => {
    const fetch = vi.fn(async (_input: string | URL | Request) =>
      Response.json({ message: "Not a valid object" }, { status: 404 }),
    );
    const met = createMetClient({ fetch });
    const trace = new TraceRecorder();

    await met.object(7, trace);
    await met.object(7, trace);

    const [live, cached] = trace.summary().calls;
    const failure = {
      url: "https://collectionapi.metmuseum.org/public/collection/v1/objects/7",
      reason: expect.stringMatching(/^404 Not Found/),
    };
    expect(live).toMatchObject({ ok: false, cached: false, failure });
    expect(cached).toMatchObject({ ok: false, cached: true, failure });
  });

  it("names a timeout as the reason a call failed", async () => {
    const fetch = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const met = createMetClient({ fetch, timeoutMs: 10 });
    const trace = new TraceRecorder();

    await expect(met.object(8, trace)).rejects.toBeInstanceOf(MetUnavailableError);
    expect(trace.summary().calls[0]?.failure?.reason).toBe("No answer within 0.01 seconds.");
  });

  it("leaves the request out of the trace when a call succeeds", async () => {
    const fetch = vi.fn(async (_input: string | URL | Request) =>
      Response.json({ objectID: 9, title: "Work 9" }),
    );
    const met = createMetClient({ fetch });
    const trace = new TraceRecorder();

    await met.object(9, trace);
    expect(trace.summary().calls[0]).not.toHaveProperty("failure");
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
