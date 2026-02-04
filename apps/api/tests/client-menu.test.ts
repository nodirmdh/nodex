import { describe, expect, it } from "vitest";

import { filterAvailableMenu } from "../src/clientMenu";

describe("filterAvailableMenu", () => {
  it("filters out unavailable items", () => {
    const items = [
      { id: "1", isAvailable: true },
      { id: "2", isAvailable: false },
    ];
    const result = filterAvailableMenu(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});
