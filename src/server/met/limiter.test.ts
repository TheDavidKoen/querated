import { describe, expect, it } from "vitest";
import { createLimiter } from "./limiter";

describe("createLimiter", () => {
  it("never runs more tasks at once than allowed, and runs them all", async () => {
    const limit = createLimiter(3);
    let active = 0;
    let peak = 0;
    const task = async (value: number) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value;
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, value) => limit(() => task(value))),
    );

    expect(peak).toBe(3);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("keeps going after a task fails", async () => {
    const limit = createLimiter(1);
    await expect(limit(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(limit(() => Promise.resolve("next"))).resolves.toBe("next");
  });
});
