import { describe, expect, it } from "vitest";

import { generateNumericCode, hashCode, normalizeNumericCode, verifyCode } from "../src/codes";

describe("pickup/delivery code hashing", () => {
  it("hashes and verifies codes correctly", () => {
    const code = generateNumericCode();
    const { hash, salt } = hashCode(code);

    expect(verifyCode(code, hash, salt)).toBe(true);
    expect(verifyCode("0000", hash, salt)).toBe(false);
  });

  it("normalizes numeric codes with leading zeros", () => {
    expect(normalizeNumericCode("42")).toBe("0042");
    expect(normalizeNumericCode("0042")).toBe("0042");
    expect(normalizeNumericCode("12 3")).toBe("0123");
    expect(normalizeNumericCode("")).toBeNull();
  });
});
