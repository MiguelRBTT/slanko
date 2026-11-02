# Arquitetura

O Slanko usa arquitetura **cliente-servidor em camadas**, full-stack com Next.js.

## Stack

| Camada | Tecnologia |
|---|---|
| Apresentação | Next.js / React / TypeScript |
| Aplicação | Rotas API, services, validação, SLA e rentabilidade |
| Dados | Repositories + Prisma |
| Persistência | MySQL (`slanko-db`) |
| Infra | Docker (app, MySQL, Prometheus, Grafana), GitHub Actions, SonarCloud |

## Camadas de código

```text
src/middleware.ts   → JWT, perfil atual no banco e CSP com nonce
src/app/            → páginas e rotas API (Next.js App Router)
src/components/     → UI (shell, navegação)
src/services/       → regras de negócio
src/repositories/   → acesso a dados (Prisma)
src/lib/            → auth, HTTP, validação, cálculos
src/types/          → DTOs
tests/              → Vitest (unitários, frontend e integração com MySQL)
prisma/             → schema, migrations, seed
```

## Visão C4 (resumo)

* **Contexto:** Gestor e Técnico usam o Slanko; MySQL persiste; CI e SonarCloud apoiam qualidade.
* **Contêineres:** `slanko-app` (Next.js), `slanko-db` (MySQL), volume `uploads` (anexos), `slanko-prometheus` e `slanko-grafana`; GitHub Actions e SonarCloud como sistemas externos.
* **Componentes:** middleware → rotas da API → services → repositories → Prisma.

Documentação completa com diagramas: [`docs/arquitetura-c4.md`](https://github.com/MiguelRBTT/slanko/blob/main/docs/arquitetura-c4.md) no repositório.
