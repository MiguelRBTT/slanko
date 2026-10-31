import { execSync } from "node:child_process";

// Aplica as migrations no banco de teste antes da suíte (cria o banco se não existir).
// Trava de segurança: só aceita bancos cujo nome termina em "_test".
export function assertTestDatabase(url: string): void {
  const databaseName = new URL(url).pathname.replace(/^\//, "");

  if (!databaseName.endsWith("_test")) {
    throw new Error(`Integration tests only run against a *_test database (got "${databaseName}")`);
  }
}

export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "mysql://slanko:slanko@localhost:3306/slanko_test";
  assertTestDatabase(url);

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
