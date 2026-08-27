import { defineConfig } from "vitest/config";
import path from "path";

// Vitest configuration with the same path alias used by Next.js.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
