import { defineConfig } from "vitest/config";
import path from "path";

const crudCoverageInclude = [
  "src/repositories/client.repository.ts",
  "src/repositories/contract.repository.ts",
  "src/services/client.service.ts",
  "src/services/contract.service.ts",
  "src/lib/validation/fields.ts",
  "src/types/client.ts",
  "src/types/contract.ts",
  "src/app/api/clients/**/*.ts",
  "src/app/api/contracts/**/*.ts",
];

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    env: {
      JWT_SECRET: "test-secret-key-with-at-least-32-characters",
      JWT_EXPIRES_IN: "1h",
    },
    coverage: {
      provider: "v8",
      include: crudCoverageInclude,
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
