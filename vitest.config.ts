import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  // tsconfig leaves JSX untransformed for Next.js to handle, so the test
  // runner needs its own transform before it can render components.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@app-types": path.resolve(__dirname, "types"),
    },
  },
});
