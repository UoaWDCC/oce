import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // tsconfig leaves JSX untransformed for Next.js to handle, so the test
  // runner needs its own transform before it can render components.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  // Component CSS modules need no PostCSS plugins in jsdom. Bypass the
  // Next.js-specific plugin format in the application's PostCSS config.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@app-types": path.resolve(__dirname, "types"),
    },
  },
});
