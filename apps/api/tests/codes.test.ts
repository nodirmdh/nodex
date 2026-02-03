import { describe, expect, it } from "vitest";

import { generateNumericCode, hashCode, verifyCode } from "../src/codes";

describe("pickup/delivery code hashing", () => {
  it("hashes and verifies codes correctly", () => {
    const code = generateNumericCode();
    const { hash, salt } = hashCode(code);

    expect(verifyCode(code, hash, salt)).toBe(true);
    expect(verifyCode("0000", hash, salt)).toBe(false);
  });
});
