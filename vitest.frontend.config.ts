import { defineConfig } from "vitest/config";
import path from "path";
import { frontendCoverageInclude } from "./vitest.coverage";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    name: "frontend",
    environment: "jsdom",
    globals: true,
    include: ["tests/frontend/**/*.test.ts", "tests/frontend/**/*.test.tsx"],
    env: {
      JWT_SECRET: "test-secret-key-with-at-least-32-characters",
      JWT_EXPIRES_IN: "1h",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage-frontend",
      include: frontendCoverageInclude,
      thresholds: {
        lines: 25,
        functions: 25,
        branches: 25,
        statements: 25,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
