import { defineConfig } from "vitest/config";
import path from "path";

// Testes de integração: rodam contra um MySQL real (banco *_test), sem mocks.
// Local: npm run test:integration (usa o MySQL do docker compose). CI: serviço MySQL do workflow.
const databaseUrl = process.env.TEST_DATABASE_URL ?? "mysql://slanko:slanko@localhost:3306/slanko_test";

export default defineConfig({
  test: {
    name: "integration",
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    // Um arquivo por vez: todos compartilham o mesmo banco.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      TEST_DATABASE_URL: databaseUrl,
      JWT_SECRET: "integration-secret-key-with-at-least-32-chars",
      JWT_EXPIRES_IN: "1h",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
