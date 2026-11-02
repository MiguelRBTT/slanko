# Arquitetura C4 - Slanko

Documentação de arquitetura no modelo **C4**, alinhada ao relatório do PAC 7B e à linha Web Apps do portfólio.

O Slanko adota arquitetura **cliente-servidor em camadas**, com aplicação full-stack em Next.js, persistência em MySQL e infraestrutura com Docker, CI/CD, análise estática e monitoramento.

## Níveis do C4 neste projeto

| Nível | Nome | Status |
|---|---|---|
| 1 | Contexto | Documentado |
| 2 | Contêineres | Documentado |
| 3 | Componentes | Componentes reais do `slanko-app` (texto) |
| 4 | Código | Fora do escopo desta documentação (detalhe no repositório) |

---

## Nível 1 - Diagrama de Contexto

Mostra o Slanko como caixa preta e quem interage com ele.

![C4 Contexto - Slanko](assets/c4-contexto.png)

### Elementos

| Elemento | Tipo | Descrição |
|---|---|---|
| Gestor | Pessoa | Administra clientes, contratos, metas de SLA e indicadores de rentabilidade. Também pode operar chamados e apontar horas. |
| Técnico | Pessoa | Opera chamados, registra horas e encerra atendimentos. |
| Slanko | Sistema de software | Sistema web de gestão de chamados, SLA e rentabilidade por contrato. |
| MySQL | Sistema externo (dados) | Persistência relacional dos dados de negócio. |
| GitHub Actions | Sistema externo | Pipeline de CI/CD (lint, testes, build). |
| SonarCloud | Sistema externo | Análise estática de qualidade e segurança. |
| Grafana / Prometheus | Sistema externo | Observabilidade e monitoramento. |

### Relacionamentos principais

* Gestor e Técnico usam o Slanko pela interface web (HTTPS).
* O Slanko lê e grava dados no MySQL.
* O pipeline (GitHub Actions) constrói e testa o Slanko.
* O SonarCloud analisa o código do projeto.
* O Slanko exporta métricas para a stack de monitoramento.

---

## Nível 2 - Diagrama de Contêineres

Contêineres como estão no `docker compose` do projeto (arquitetura em camadas da Figura 1 do relatório).

![C4 Contêineres - Slanko](assets/c4-conteineres.png)

### Contêineres do Slanko

| Contêiner | Tecnologia | Responsabilidade |
|---|---|---|
| `slanko-app` | Next.js 15, React, TypeScript, Prisma (imagem do `Dockerfile`) | Interface responsiva, API REST interna, middleware de segurança (JWT, perfil atual no banco, CSP com nonce), regras de SLA e rentabilidade, acesso a dados via ORM e `/api/metrics`. |
| `slanko-db` | MySQL 8.4 | Persistência de usuários, clientes, contratos, chamados, apontamentos, observadores, anexos (metadados) e histórico de eventos. |
| `uploads` | Volume Docker | Arquivos dos anexos (imagens e vídeos), lidos e gravados pelo `slanko-app`. |
| `slanko-prometheus` | Prometheus | Coleta `/api/metrics` a cada 15 s, com token, e guarda as séries. |
| `slanko-grafana` | Grafana | Painel provisionado **Slanko Overview** sobre os dados do Prometheus. |

### Mapeamento para as camadas do relatório

```text
Camada de Apresentação
Next.js (React / TypeScript), interface responsiva
        |
        v  API REST interna
Camada de Aplicação
Rotas/API Next.js, validação, regras de SLA e rentabilidade
        |
        v  ORM / consultas parametrizadas (Prisma)
Camada de Dados
MySQL (contratos, chamados, horas, usuários)
        |
        v
Infraestrutura
Docker (slanko-app, slanko-db, Prometheus, Grafana), GitHub Actions, SonarCloud
```

No nível de contêineres, a apresentação e a aplicação ficam no mesmo processo/`slanko-app` (Next.js full-stack), e a camada de dados fica no `slanko-db`.

### Comunicação

| De | Para | Protocolo / forma | Motivo |
|---|---|---|---|
| Gestor / Técnico | `slanko-app` | HTTPS (navegador; HTTPS local com `npm run dev`) | Uso da aplicação |
| `slanko-app` | `slanko-db` | SQL via Prisma | Persistência |
| `slanko-app` | `uploads` | Sistema de arquivos | Anexos dos chamados |
| `slanko-prometheus` | `slanko-app` | HTTP `GET /api/metrics` com `Bearer METRICS_TOKEN` (coleta a cada 15 s) | Observabilidade |
| `slanko-grafana` | `slanko-prometheus` | PromQL | Painéis |
| GitHub Actions | código do repositório | Pipeline CI | Lint, typecheck, testes com cobertura, build e integração com MySQL |
| GitHub Actions | SonarCloud | Integração CI | Quality Gate e cobertura |

### Decisão de empacotamento

* Um único contêiner de aplicação (`slanko-app`) reduz complexidade no MVP acadêmico e mantém domínio técnico sobre a infraestrutura (Docker), evitando plataformas só de frontend. Ele fica no perfil `app` do compose (`npm run app:up`) e aplica as migrations ao iniciar.
* Banco separado (`slanko-db`) garante persistência relacional real (MySQL), conforme a linha Web Apps.
* `npm run db:up` sobe banco, Prometheus e Grafana; no desenvolvimento, o app roda fora do Docker com `npm run dev`.

---

## Nível 3 - Componentes

Organização interna do `slanko-app`. Toda requisição à API passa pelo middleware antes de chegar às rotas; as rotas chamam services, que chamam repositories.

```text
Navegador ──> middleware.ts ──> app/api/*/route.ts ──> services/ ──> repositories/ ──> Prisma ──> MySQL
              (JWT, perfil      (lê o corpo, checa      (regras de     (consultas)
               no banco, CSP)    perfil, responde)        negócio)
```

| Componente | Onde está | Responsabilidade | Casos de uso / RF |
|---|---|---|---|
| Segurança | `src/middleware.ts`, `auth.service`, `src/lib/auth/` | JWT, usuário ativo e perfil atual a cada requisição, CSP com nonce, limite de tentativas de login | UC01, RF01, RNF08 |
| Clientes e contratos | `client.service`, `contract.service` | Cadastro, vigência, valor mensal e metas de SLA | UC02-UC04, RF02, RF03, RF08 |
| Equipe | `user.service`, tela `/users` | Pessoas, perfil, custo/hora, desativação e senha | UC12, RF01, RF11 |
| Chamados | `ticket.service`, `src/lib/tickets/` | Abertura, atribuição, observadores, situação, metas de SLA congeladas e exclusão restrita | UC05, UC06, UC08, UC15, RF04, RF05, RF07 |
| Apontamentos | `time-entry.service` | Registro e correção de horas, custo/hora congelado, 1ª resposta | UC07, RF06, RF11 |
| Histórico | `ticket-event.repository`, `src/lib/tickets/events.ts` | Evento imutável para cada alteração, gravado na mesma escrita | UC13, RF07 |
| Anexos | `ticket-attachment.service`, `src/lib/attachments/` | Upload com checagem de tipo pelos bytes, limite de tamanho e volume `uploads` | UC14, RF04 |
| SLA | `sla.service`, `src/lib/sla/` | Cumprimento, violações (inclusive prazos vencidos sem resposta) e alertas por contrato | UC09, RF09, RF10, RF13 |
| Rentabilidade | `profitability.service`, `src/lib/profitability/` | Receita proporcional ao período, custo das horas e margem | UC10, RF11, RF12, RF13 |
| Painel | `src/app/(app)/dashboard`, `src/lib/reports/` | Indicadores consolidados com filtros por situação, cliente, contrato e período | UC11, RF14 |
| Observabilidade | `metrics.service`, `src/lib/observability/` | Saúde, métricas de negócio, erros da API e logins para o Prometheus | RNF07 |

---

## Requisitos de arquitetura atendidos

| Requisito (RFC / Web Apps) | Como a arquitetura atende |
|---|---|
| Arquitetura definida | Cliente-servidor em camadas, documentada em C4 |
| Modularidade | Separação app (páginas e rotas) / services / repositories / lib / tests |
| Persistência real | MySQL (`slanko-db`), sem SQLite/H2 |
| CI/CD | GitHub Actions: lint, typecheck, testes com cobertura, build, SonarCloud e integração com MySQL |
| Análise estática | SonarCloud |
| Observabilidade | Prometheus e Grafana, com métricas de saúde, de negócio, de erros e de login |
| Segurança | JWT com perfil checado no banco a cada requisição, CSP com nonce, limite de login, validação de entradas, checagem de anexos, segredos em `.env` |

---

## Próximos passos de arquitetura

1. Atualizar o diagrama de contêineres se o deploy mudar (ex.: proxy reverso com HTTPS na frente do `slanko-app`).
2. Republicar a Wiki (`scripts/publish-wiki.ps1`) sempre que esta documentação mudar.

## Referências

* Relatório Final PAC 7B - Proposta Slanko (seção Arquitetura e tecnologias).
* [docs/RFC.md](RFC.md)
* [docs/casos-de-uso.md](casos-de-uso.md)
* [docs/modelagem.md](modelagem.md)
* Modelo C4: https://c4model.com/
