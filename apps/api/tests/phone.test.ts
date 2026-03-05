import { describe, expect, it } from "vitest";

import { normalizeUzPhone } from "../src/phone";

describe("normalizeUzPhone", () => {
  it("normalizes valid +998 numbers", () => {
    expect(normalizeUzPhone("+998 90 123-45-67")).toBe("+998901234567");
  });

  it("rejects non +998 numbers", () => {
    expect(normalizeUzPhone("+77001234567")).toBeNull();
  });

  it("rejects incomplete numbers", () => {
    expect(normalizeUzPhone("+99890123")).toBeNull();
  });
});
