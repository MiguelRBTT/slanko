# CI/CD e Qualidade

## GitHub Actions

Workflow: [`.github/workflows/ci.yml`](https://github.com/MiguelRBTT/slanko/blob/main/.github/workflows/ci.yml)

Dispara em push/PR para `main`:

1. `npm ci`
2. `npx prisma validate`
3. `npm run lint`
4. `npm run test:coverage` (gera LCOV)
5. `npm run build`
6. **SonarCloud Scan** (se existir o secret `SONAR_TOKEN`)

## SonarCloud (RNF06)

* Config: [`sonar-project.properties`](https://github.com/MiguelRBTT/slanko/blob/main/sonar-project.properties)
* Cobertura: `coverage/lcov.info` (Vitest)
* Quality Gate: `sonar.qualitygate.wait=true`
* Painel: [MiguelRBTT_slanko](https://sonarcloud.io/summary/new_code?id=MiguelRBTT_slanko)

### Secret necessário

No repositório GitHub → **Settings → Secrets and variables → Actions**:

* Nome: `SONAR_TOKEN`
* Valor: token gerado em SonarCloud → My Account → Security

Automatic Analysis do SonarCloud deve ficar **desligada** (o scan é só via CI).

## Cobertura de testes

Metas RNF04 no CI (`npm run test:coverage`):

* Backend ≥ **75%** (`vitest.config.ts` → `coverage/`)
* Frontend ≥ **25%** (`vitest.frontend.config.ts` → `coverage-frontend/`)

Escopos em `vitest.coverage.ts`. Testes de UI em `tests/frontend/`.
