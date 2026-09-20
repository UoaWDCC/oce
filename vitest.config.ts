import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {},
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@app-types": path.resolve(__dirname, "types"),
    },
  },
});
