import { describe, expect, it } from "vitest";
import { clientAddress, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit inside one window, then refuses with a retry time", () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => time });
    expect(limiter.take("a").allowed).toBe(true);
    time = 10_000;
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a")).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it("keeps separate budgets per client", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("b").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
  });

  it("frees the budget once the window slides past", () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => time });
    limiter.take("a");
    time = 1001;
    expect(limiter.take("a").allowed).toBe(true);
  });

  it("stops tracking stale clients when the table is full", () => {
    let time = 0;
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 1000,
      maxTrackedClients: 2,
      now: () => time,
    });
    limiter.take("a");
    limiter.take("b");
    time = 5000;
    limiter.take("c");
    expect(limiter.take("a").allowed).toBe(true);
  });
});

describe("clientAddress", () => {
  it("takes the first forwarded address", () => {
    expect(clientAddress(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back when the header is missing", () => {
    expect(clientAddress(new Headers())).toBe("unknown");
  });
});
