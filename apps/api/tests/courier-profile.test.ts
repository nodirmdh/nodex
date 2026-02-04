import { describe, expect, it } from "vitest";

import { buildServer } from "../src/server";

describe("courier profile validation", () => {
  it("rejects invalid delivery method", async () => {
    const app = buildServer();
    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/courier/profile",
        headers: {
          "x-dev-user": "courier",
        },
        payload: {
          delivery_method: "PLANE",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ message: "invalid delivery_method" });
    } finally {
      await app.close();
    }
  });
});
