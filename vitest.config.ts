import { defineConfig } from "vitest/config";
import path from "path";

// Vitest configuration with the same path alias used by Next.js.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-key-with-at-least-32-characters",
      JWT_EXPIRES_IN: "1h",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
