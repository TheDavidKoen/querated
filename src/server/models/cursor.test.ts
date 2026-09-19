import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";

describe("page cursors", () => {
  it("round-trips an offset", () => {
    expect(decodeCursor(encodeCursor(0))).toBe(0);
    expect(decodeCursor(encodeCursor(48))).toBe(48);
  });

  it("rejects anything the server did not issue", () => {
    expect(decodeCursor("48")).toBeNull();
    expect(decodeCursor(Buffer.from("offset:-1").toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from("offset:048").toString("base64url"))).toBeNull();
    expect(decodeCursor(`${encodeCursor(48)}==`)).toBeNull();
  });

  it("rejects positions too long to be a Met search offset", () => {
    expect(decodeCursor(encodeCursor(100_000))).toBeNull();
  });
});
