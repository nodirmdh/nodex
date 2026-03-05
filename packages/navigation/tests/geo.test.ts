import { describe, expect, it } from "vitest";

import { estimateEtaMinutes, formatEtaMinutes, formatKm, haversineKm } from "../src/utils/geo";

describe("geo utils", () => {
  it("calculates haversine distance", () => {
    const distance = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(distance).toBeGreaterThan(100);
  });

  it("formats distance and ETA", () => {
    expect(formatKm(0.5)).toBe("500 m");
    expect(formatKm(2)).toBe("2.0 km");
    expect(formatEtaMinutes(0.4)).toBe("<1 min");
    expect(formatEtaMinutes(20)).toBe("20 min");
  });

  it("estimates ETA", () => {
    const minutes = estimateEtaMinutes(10, 20);
    expect(Math.round(minutes)).toBe(30);
  });
});
