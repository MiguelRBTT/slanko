# Slanko

Sistema web para gestão de contratos de suporte técnico com análise de **SLA** e **rentabilidade**.

**Estudante:** Miguel Ricardo Buttendorf  
**Curso:** Engenharia de Software  
**Instituição:** Centro Universitário Católica de Santa Catarina  
**Linha:** Web Apps (PAC VII / Portfólio)  
**Repositório:** [MiguelRBTT/slanko](https://github.com/MiguelRBTT/slanko)

---

## O que é

O Slanko centraliza chamados, contratos, apontamento de horas, cumprimento de SLA e indicadores de margem por contrato, voltado a microempresas de TI.

Três fluxos de negócio:

1. **Gestão de chamados** — clientes, contratos, abertura, atribuição, horas e encerramento
2. **Monitoramento de SLA** — metas por contrato, violações e painel
3. **Análise de rentabilidade** — horas × custo/hora versus valor do contrato

## Navegação da Wiki

| Página | Conteúdo |
|---|---|
| [Guia de Execução](Guia-de-Execucao) | Setup local, seed e como rodar a app |
| [Arquitetura](Arquitetura) | Camadas, stack e visão C4 |
| [API](API) | Endpoints HTTP e perfis |
| [Autenticação](Autenticacao) | JWT, perfis gestor/técnico |
| [Casos de Uso](Casos-de-Uso) | UC01–UC11 |
| [Modelagem de Dados](Modelagem-de-Dados) | Entidades e Prisma |
| [CI/CD e Qualidade](CI-CD-e-Qualidade) | GitHub Actions e SonarCloud |
| [Documentação Técnica](Documentacao-Tecnica) | Links para `docs/` no repositório |

## Links rápidos

* [README do repositório](https://github.com/MiguelRBTT/slanko/blob/main/README.md)
* [CI (GitHub Actions)](https://github.com/MiguelRBTT/slanko/actions)
* [SonarCloud](https://sonarcloud.io/summary/new_code?id=MiguelRBTT_slanko)
* App local: [http://localhost:3000](http://localhost:3000) (após `npm run dev`)

## Status

Back-end, front-end (dashboard), testes, CI e SonarCloud concluídos. Observabilidade (Grafana/Prometheus) e metas globais de cobertura 75%/25% seguem no roadmap.
