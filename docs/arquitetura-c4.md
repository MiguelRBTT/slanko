# Arquitetura C4 - Slanko

Documentação de arquitetura no modelo **C4**, alinhada ao relatório do PAC 7B e à linha Web Apps do portfólio.

O Slanko adota arquitetura **cliente-servidor em camadas**, com aplicação full-stack em Next.js, persistência em MySQL e infraestrutura com Docker, CI/CD, análise estática e monitoramento.

## Níveis do C4 neste projeto

| Nível | Nome | Status |
|---|---|---|
| 1 | Contexto | Documentado |
| 2 | Contêineres | Documentado |
| 3 | Componentes | Visão inicial (evolui com o código) |
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

Detalha a visão de contêineres prevista no relatório (Figura 1 / arquitetura em camadas).

![C4 Contêineres - Slanko](assets/c4-conteineres.png)

### Contêineres do Slanko

| Contêiner | Tecnologia | Responsabilidade |
|---|---|---|
| `slanko-app` | Next.js, React, TypeScript, Prisma | Interface responsiva, API REST interna, validação, autenticação JWT, regras de SLA e rentabilidade, acesso a dados via ORM. |
| `slanko-db` | MySQL | Persistência de usuários, clientes, contratos, chamados, apontamentos de horas e metas de SLA. |

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
Docker (slanko-app, slanko-db), GitHub Actions, SonarCloud,
Grafana e/ou Prometheus
```

No nível de contêineres, a apresentação e a aplicação ficam no mesmo processo/`slanko-app` (Next.js full-stack), e a camada de dados fica no `slanko-db`.

### Comunicação

| De | Para | Protocolo / forma | Motivo |
|---|---|---|---|
| Gestor / Técnico | `slanko-app` | HTTPS (UI) | Uso da aplicação |
| `slanko-app` | `slanko-db` | SQL via Prisma | Persistência |
| GitHub Actions | `slanko-app` (código) | Pipeline CI | Lint, testes e build |
| GitHub Actions / repo | SonarCloud | Integração CI | Qualidade e segurança |
| `slanko-app` | Grafana / Prometheus | Métricas / instrumentação | Observabilidade |

### Decisão de empacotamento

* Um único contêiner de aplicação (`slanko-app`) reduz complexidade no MVP acadêmico e mantém domínio técnico sobre a infraestrutura (Docker), evitando plataformas só de frontend.
* Banco separado (`slanko-db`) garante persistência relacional real (MySQL), conforme a linha Web Apps.

---

## Nível 3 - Componentes (visão inicial)

Visão prevista da organização interna do `slanko-app`, alinhada à estrutura citada no relatório:

```text
slanko-app
├── components/      # Interface (UI)
├── services/        # Regras de negócio (SLA, rentabilidade, chamados)
├── repositories/    # Acesso a dados (Prisma)
└── tests/           # Testes automatizados (TDD)
```

### Componentes lógicos previstos

| Componente | Responsabilidade | Casos de uso / RF |
|---|---|---|
| Autenticação e autorização | Login JWT e controle por perfil (gestor / técnico) | UC01, RF01 |
| Clientes e contratos | Cadastro e vínculo cliente-contrato | UC02, UC03, RF02, RF03 |
| Chamados | Abertura, atribuição, horas e encerramento | UC05-UC08, RF04-RF07 |
| SLA | Metas, cálculo de cumprimento e violações | UC04, UC09, RF08-RF10 |
| Rentabilidade | Custo por horas, margem e alertas | UC10, UC11, RF11-RF14 |
| Dashboard | Consolidação visual de indicadores | UC11, RF14 |

Este nível será refinado com diagramas adicionais quando os módulos existirem no código.

---

## Requisitos de arquitetura atendidos

| Requisito (RFC / Web Apps) | Como a arquitetura atende |
|---|---|
| Arquitetura definida | Cliente-servidor em camadas, documentada em C4 |
| Modularidade | Separação components / services / repositories / tests |
| Persistência real | MySQL (`slanko-db`), sem SQLite/H2 |
| CI/CD | GitHub Actions |
| Análise estática | SonarCloud |
| Observabilidade | Grafana e/ou Prometheus |
| Segurança básica | JWT, perfis, validação de entradas, segredos em `.env` |

---

## Próximos passos de arquitetura

1. Detalhar o nível de componentes com diagrama próprio após o scaffold.
2. Publicar esta documentação também na Wiki do GitHub.
3. Atualizar o diagrama de contêineres se o deploy local/produção mudar (ex.: reverse proxy).

## Referências

* Relatório Final PAC 7B - Proposta Slanko (seção Arquitetura e tecnologias).
* [docs/RFC.md](RFC.md)
* [docs/casos-de-uso.md](casos-de-uso.md)
* [docs/modelagem.md](modelagem.md)
* Modelo C4: https://c4model.com/
