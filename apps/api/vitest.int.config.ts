import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.int.test.ts"],
    clearMocks: true
  }
});
