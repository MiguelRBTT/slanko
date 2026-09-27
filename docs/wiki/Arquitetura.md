# Arquitetura

O Slanko usa arquitetura **cliente-servidor em camadas**, full-stack com Next.js.

## Stack

| Camada | Tecnologia |
|---|---|
| Apresentação | Next.js / React / TypeScript |
| Aplicação | Rotas API, services, validação, SLA e rentabilidade |
| Dados | Repositories + Prisma |
| Persistência | MySQL (`slanko-db`) |
| Infra | Docker, GitHub Actions, SonarCloud |

## Camadas de código

```text
src/app/            → páginas e rotas API (Next.js App Router)
src/components/     → UI (shell, navegação)
src/services/       → regras de negócio
src/repositories/   → acesso a dados (Prisma)
src/lib/            → auth, HTTP, validação, cálculos
src/types/          → DTOs
tests/              → Vitest
prisma/             → schema, migrations, seed
```

## Visão C4 (resumo)

* **Contexto:** Gestor e Técnico usam o Slanko; MySQL persiste; CI e SonarCloud apoiam qualidade.
* **Contêineres:** app Next.js + MySQL + pipeline.
* **Componentes:** API routes → services → repositories → Prisma.

Documentação completa com diagramas: [`docs/arquitetura-c4.md`](https://github.com/MiguelRBTT/slanko/blob/main/docs/arquitetura-c4.md) no repositório.
