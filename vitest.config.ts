import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // we'll add more config as needed
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@app-types": path.resolve(__dirname, "types"),
    },
  },
});
