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

Hoje: 100% nos módulos de back-end configurados em `vitest.config.ts`.  
Meta global da linha Web Apps (75% backend / 25% frontend) ainda no roadmap.
