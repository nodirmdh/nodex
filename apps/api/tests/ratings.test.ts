import { describe, expect, it } from "vitest";

import { applyRatingAggregate, assertRateableStatus, validateStars } from "../src/ratings";

describe("ratings", () => {
  it("rejects rating before completion", () => {
    expect(() => assertRateableStatus("NEW")).toThrow("order not completed");
  });

  it("applies aggregate correctly", () => {
    const result = applyRatingAggregate(4, 2, 5);
    expect(result.ratingCount).toBe(3);
    expect(result.ratingAvg).toBeCloseTo(4.333, 3);
  });

  it("validates stars range", () => {
    expect(() => validateStars(0)).toThrow("stars must be between 1 and 5");
  });
});
