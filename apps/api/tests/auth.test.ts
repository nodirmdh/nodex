import { describe, expect, it } from "vitest";

import { signAuthToken, verifyAuthToken, requireRoleFromHeaders } from "../src/auth";

describe("auth tokens", () => {
  it("signs and verifies role payloads", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = signAuthToken({ sub: "user-1", role: "CLIENT", clientId: "user-1" });
    const payload = verifyAuthToken(token);
    expect(payload.role).toBe("CLIENT");
    expect(payload.sub).toBe("user-1");
    expect(payload.clientId).toBe("user-1");
  });

  it("requires expected role from headers", () => {
    process.env.JWT_SECRET = "test-secret";
    const token = signAuthToken({ sub: "admin", role: "ADMIN" });
    const payload = requireRoleFromHeaders({ authorization: `Bearer ${token}` }, "ADMIN");
    expect(payload.role).toBe("ADMIN");
  });
});
