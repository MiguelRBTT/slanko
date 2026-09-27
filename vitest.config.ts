import { defineConfig } from "vitest/config";
import path from "path";
import { backendCoverageInclude } from "./vitest.coverage";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/frontend/**"],
    env: {
      JWT_SECRET: "test-secret-key-with-at-least-32-characters",
      JWT_EXPIRES_IN: "1h",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: backendCoverageInclude,
      exclude: ["src/lib/client/**"],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
