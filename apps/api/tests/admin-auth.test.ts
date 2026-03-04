import { describe, expect, it } from "vitest";

import { AuthError, requireAdminFromHeaders, signAdminToken } from "../src/adminAuth";

describe("admin auth", () => {
  it("accepts valid admin token", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = signAdminToken();

    expect(() =>
      requireAdminFromHeaders({ authorization: `Bearer ${token}` }),
    ).not.toThrow();
  });

  it("rejects missing token", () => {
    process.env.JWT_SECRET = "test-secret";
    expect(() => requireAdminFromHeaders({})).toThrow(AuthError);
  });

  it("rejects invalid token", () => {
    process.env.JWT_SECRET = "test-secret";
    expect(() =>
      requireAdminFromHeaders({ authorization: "Bearer invalid" }),
    ).toThrow(AuthError);
  });
});
