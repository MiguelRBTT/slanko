# Capa

* **Título do Projeto**: Slanko - Sistema Web para Gestão de Contratos de Suporte Técnico com Análise de SLA e Rentabilidade
* **Nome do Estudante**: Miguel Ricardo Buttendorf
* **Curso**: Engenharia de Software
* **Instituição**: Centro Universitário Católica de Santa Catarina
* **Linha de projeto**: Web Apps (PAC VII / Portfólio)
* **Identificador do repositório**: `slanko`

# Resumo

Este documento formaliza o escopo, os requisitos, os fluxos de negócio e as decisões técnicas iniciais do **Slanko**, um sistema web voltado a microempresas de TI que prestam suporte técnico. A proposta integra gestão de chamados, monitoramento de SLA e análise de rentabilidade com base no custo real das horas trabalhadas, apoiando decisões como renegociação de contratos e ajuste de escopo.

## 1. Introdução

### Contexto

Microempresas de TI costumam controlar chamados e prazos em planilhas ou em ferramentas separadas. Com equipes enxutas, o mesmo gestor acumula funções operacionais e administrativas. Sem consolidar chamados, metas de SLA e custo das horas, fica difícil saber quais contratos geram margem e quais consomem mais recursos do que geram receita.

### Problema de pesquisa

Como microempresas de TI que prestam suporte técnico podem obter uma visão clara e integrada da rentabilidade de seus contratos, considerando o controle de chamados, o cumprimento de SLA e o custo real das horas trabalhadas?

### Hipótese

A implementação de um sistema web que integre controle de chamados, monitoramento de SLA e cálculo automático de custos permitirá identificar com maior precisão a rentabilidade dos contratos de suporte técnico, apoiando decisões estratégicas como renegociação de valores e ajuste de escopo.

### Justificativa

Ferramentas de mercado (Zendesk, Jira Service Management, Freshservice) cobrem bem tickets e SLA, mas pouco consolidam custo por hora e margem por contrato de forma simples e acessível para microempresas. O Slanko ocupa essa lacuna com foco operacional (helpdesk + SLA) e indicadores de rentabilidade derivados do tempo de atendimento, sem se tornar um ERP ou um sistema financeiro completo.

### Objetivos

**Objetivo geral**

Desenvolver um sistema web para gestão de contratos de suporte técnico que integre controle de SLA e análise de rentabilidade, voltado a microempresas de TI.

**Objetivos específicos**

1. Mapear processos de gestão de contratos de suporte técnico.
2. Identificar métricas de SLA e desempenho operacional.
3. Definir modelo de custo por horas trabalhadas.
4. Implementar registro e acompanhamento de chamados.
5. Monitorar cumprimento de SLA por contrato.
6. Gerar relatórios que relacionem horas, custo e valor contratual.
7. Disponibilizar indicadores de rentabilidade por cliente e contrato.

### Trabalhos relacionados

Foram analisados três trabalhos acadêmicos e três softwares de mercado, buscando funcionalidades reutilizáveis e lacunas que a proposta endereça.

**Trabalhos acadêmicos**

* Rachmawati e Suhendra (2018) apresentam um helpdesk web com registro e acompanhamento de tickets, mostrando a viabilidade de soluções acessíveis para gestão de chamados.
* Clarin (2023) explora priorização de atendimentos com algoritmos de escalonamento, recurso útil para equipes com capacidade limitada.
* Jain, Gupta e Neha (2024) investigam uso de inteligência artificial na otimização de filas de suporte, com foco em eficiência operacional e não em indicadores de margem por contrato.

**Softwares de mercado**

* Zendesk e Jira Service Management oferecem módulos maduros de SLA, automações e relatórios operacionais.
* Freshservice inclui gestão de contratos, porém sem consolidar de forma nativa o custo por hora trabalhada e a rentabilidade por contrato.

**Lacuna e posicionamento do Slanko**

A maior parte das soluções concentra-se no gerenciamento operacional (tickets e SLA), sem integrar indicadores financeiros de rentabilidade baseados no custo real das horas. O Slanko mantém gestão de chamados e SLA como núcleo e acrescenta a camada de análise de custo/margem por contrato, voltada a microempresas de TI.

Comparativo resumido (detalhe no relatório PAC 7B, Tabela 2):

| Característica | Acadêmicos / mercado analisados | Slanko |
|---|---|---|
| Gestão de chamados | Presente na maioria | Sim |
| Monitoramento de SLA | Presente sobretudo no mercado | Sim |
| Gestão de contratos | Parcial (ex.: Freshservice) | Sim |
| Custo por horas trabalhadas | Ausente ou não evidenciado | Sim |
| Rentabilidade por cliente/contrato | Ausente ou não evidenciado | Sim |

## 2. Descrição do Projeto

### Tema

Sistema web (Web App) para centralizar clientes, contratos, chamados, apontamento de horas, metas de SLA e indicadores de rentabilidade.

### Personas

* **Gestor**: cadastra clientes e contratos, define metas de SLA, acompanha indicadores e toma decisões sobre escopo e renegociação. Também pode operar chamados e registrar horas quando atuar no atendimento.
* **Técnico**: abre e atualiza chamados, registra horas trabalhadas e encerra atendimentos com registro de solução.

### Problemas a resolver

* Dados operacionais e de custo dispersos em planilhas e ferramentas isoladas.
* Dificuldade de relacionar horas trabalhadas ao valor do contrato.
* Falta de visão consolidada de violações de SLA por cliente/contrato.
* Decisões de renegociação sem indicadores objetivos de margem.

### Escopo (o que entra)

Três fluxos de negócio completos:

1. **Gestão de chamados**: clientes, contratos, abertura, atribuição, prioridade, categoria, apontamento de horas e encerramento com histórico.
2. **Monitoramento de SLA**: metas de tempo de resposta e resolução por contrato, cálculo de cumprimento, sinalização de violações e painel por cliente/contrato/período.
3. **Análise de rentabilidade**: custo operacional (horas x custo/hora do colaborador) comparado à receita do contrato, margem e alertas para contratos deficitários.

Complementares no escopo inicial:

* Autenticação com JWT e perfis (gestor e técnico).
* Dashboard com indicadores de SLA e rentabilidade.
* Feedback visual ao usuário (carregamento, erros, confirmações).
* Documentação técnica (RFC, casos de uso, C4, guia de execução).
* Testes com TDD, CI/CD, análise estática e observabilidade (conforme linha Web Apps).

### Fora de escopo / limitações

* Não é sistema de gestão financeira (contas a pagar/receber, fluxo de caixa, contabilidade).
* Não substitui ERP completo.
* Não inclui automação por IA no escopo inicial.
* Não inclui mensageria assíncrona, cache Redis ou multilíngue no MVP (trabalhos futuros).
* Apresentação acadêmica prevista em ambiente local (`localhost`), conforme orientação da orientadora; hospedagem pública permanece como meta alinhada ao playbook institucional, se exigida na entrega final.

### Diferencial

Integração nativa entre operação (chamados + SLA) e indicadores econômicos por contrato, calculando custo pelas horas apontadas e destacando contratos deficitários, em solução enxuta para microempresas de TI.

## 3. Especificação Técnica

### 3.1. Requisitos de Software

**Requisitos Funcionais (RF):**

```
RF01: Autenticar usuários com JWT e controlar acesso por perfil (gestor e técnico).
RF02: Cadastrar, editar e listar clientes.
RF03: Cadastrar, editar e listar contratos vinculados a clientes, com valor e vigência.
RF04: Abrir chamados com prioridade, categoria e vínculo a cliente/contrato.
RF05: Atribuir chamado a um técnico responsável.
RF06: Registrar apontamento de horas em chamados (gestor ou técnico).
RF07: Encerrar chamado com registro de solução e manter histórico auditável.
RF08: Configurar metas de SLA (tempo de resposta e resolução) por contrato.
RF09: Calcular cumprimento de SLA com base nos eventos do chamado.
RF10: Sinalizar violações de SLA e exibir painel por cliente, contrato e período.
RF11: Calcular custo operacional a partir de horas x custo/hora do colaborador.
RF12: Comparar custo operacional ao valor do contrato e exibir margem/rentabilidade.
RF13: Exibir alertas visuais para contratos deficitários ou com violações recorrentes de SLA.
RF14: Disponibilizar dashboard com indicadores de SLA e rentabilidade.
```

**Requisitos Não Funcionais (RNF):**

```
RNF01: Interface responsiva e navegável, com feedback de carregamento, erro e confirmação.
RNF02: Arquitetura cliente-servidor em camadas, com separação de apresentação, regras e dados.
RNF03: Persistência em banco relacional MySQL (sem banco em disco local tipo SQLite).
RNF04: Cobertura de testes unitários com TDD: mínimo 75% no backend e 25% no frontend.
RNF05: Pipeline CI/CD com GitHub Actions (lint/testes; deploy conforme decisão de entrega).
RNF06: Análise estática de código (SonarCloud).
RNF07: Observabilidade básica (Grafana e/ou Prometheus, ou equivalente documentado).
RNF08: Segurança: validação de entradas, proteção contra XSS/CSRF e senhas criptografadas.
RNF09: Código modular (components, services, repositories, tests) sob o identificador slanko.
RNF10: Documentação em repositório/Wiki: requisitos, casos de uso, arquitetura C4 e instruções de execução.
```

### Critérios de aceite por fluxo

**Fluxo 1 - Gestão de chamados**

* Dado um gestor autenticado, ele cadastra cliente e contrato.
* Dado um técnico ou gestor autenticado, ele abre um chamado vinculado a contrato, com prioridade e categoria.
* O chamado pode ser atribuído, receber horas e ser encerrado com solução.
* O histórico do chamado permanece consultável após o encerramento.

**Fluxo 2 - Monitoramento de SLA**

* Dado um contrato com metas de resposta e resolução, o sistema calcula o cumprimento a partir dos eventos do chamado.
* Violações são sinalizadas de forma visível.
* Existe painel consolidado por cliente, contrato e período.

**Fluxo 3 - Análise de rentabilidade**

* Horas apontadas multiplicadas pelo custo/hora geram custo operacional.
* O custo é comparado ao valor do contrato, gerando margem.
* Contratos deficitários aparecem com alerta visual no dashboard/relatório.

### Representação dos requisitos

* Diagrama de casos de uso: [docs/casos-de-uso.md](casos-de-uso.md) e [docs/assets/diagrama-casos-de-uso.svg](assets/diagrama-casos-de-uso.svg).
* Modelagem de dados: documento dedicado em [docs/modelagem.md](modelagem.md).

### 3.2. Considerações de Design e Arquitetura

**Padrão**: cliente-servidor em camadas.

```text
Camada de Apresentação
Next.js, React e TypeScript (interface responsiva)

API REST interna

Camada de Aplicação
Rotas/API Next.js, validação, regras de SLA e rentabilidade

Camada de Dados
MySQL, Prisma, consultas parametrizadas

Infraestrutura
Docker, GitHub Actions, SonarCloud, monitoramento
```

**Organização de código (prevista)**

* `components/` interface
* `services/` regras de negócio
* `repositories/` acesso a dados
* `tests/` testes automatizados

**Modelos C4**

Documentação completa em [docs/arquitetura-c4.md](arquitetura-c4.md):

* Contexto: gestores e técnicos usam o Slanko; integrações com MySQL, GitHub Actions, SonarCloud e monitoramento.
* Contêineres: `slanko-app` (Next.js) e `slanko-db` (MySQL), com pipeline e observabilidade.
* Componentes: visão inicial dos módulos de autenticação, clientes/contratos, chamados, SLA e rentabilidade.

### 3.3. Stack Tecnológica

* **Linguagem**: TypeScript
* **Framework**: Next.js (React)
* **Banco**: MySQL
* **ORM**: Prisma
* **Containerização**: Docker (`slanko-app`, `slanko-db`)
* **Testes**: Jest e/ou Vitest (TDD)
* **CI/CD**: GitHub Actions
* **Qualidade**: SonarCloud
* **Observabilidade**: Grafana e/ou Prometheus

### 3.4. Considerações de Segurança

* Autenticação via JWT.
* Perfis de acesso (gestor e técnico) com autorização nas rotas.
* Criptografia de senhas (ex.: bcrypt).
* Validação e sanitização de entradas.
* Proteção contra XSS e CSRF.
* Segredos apenas em variáveis de ambiente (`.env` fora do versionamento).

### 3.5. Entidades principais

Modelagem formalizada em [docs/modelagem.md](modelagem.md):

* **User** (perfil, custo/hora)
* **Client**
* **Contract** (valor, vigência e metas de SLA no próprio contrato)
* **Ticket** (status, prioridade, categoria, datas de abertura/resposta/resolução)
* **TimeEntry** (apontamento de horas por chamado e colaborador)

Decisão do MVP: sem tabela separada `SlaRule`; metas ficam em `contracts.response_minutes` e `contracts.resolution_minutes`.

## 4. Metodologia

Desenvolvimento ágil iterativo (Kanban), com ciclos curtos de implementação, testes e validação. Commits frequentes e entregas modulares. Evita-se processo em cascata. RFCs registram decisões relevantes de escopo e arquitetura.

### Versionamento de commits

* `Feat:` nova funcionalidade
* `Fix:` correção
* `Docs:` documentação
* `Test:` testes
* `Chore:` configuração/infra

## 5. Próximos Passos

1. Configurar ambiente local (Next.js, Docker MySQL, Prisma) a partir de `docs/modelagem.md`.
2. Implementar autenticação e módulo de clientes/contratos.
3. Implementar chamados, SLA e rentabilidade.
4. Evoluir testes (metas 75%/25%), CI, SonarCloud e monitoramento.
5. Publicar documentação na Wiki do GitHub e refinar o C4 de componentes.

## 6. Referências

### Trabalhos acadêmicos

* RACHMAWATI, E.; SUHENDRA. Web-Based Ticketing System Helpdesk Application Using CodeIgniter Framework: Case Study PT Commonwealth Life. International Journal of Computer Science and Mobile Computing, v. 7, n. 12, p. 29-41, 2018. Disponível em: http://ijcsmc.com/docs/papers/December2018/V7I12201812.pdf. Acesso em: 20 maio 2026.
* CLARIN, J. A. Priority-Based Scheduling Algorithm for Help Desk Support System. International Journal of Intelligent Systems and Applications in Engineering, v. 11, n. 4, p. 299-307, 2023. Disponível em: https://ijisae.org/index.php/IJISAE/article/view/3526. Acesso em: 20 maio 2026.
* JAIN, S.; GUPTA, A.; NEHA, K. AI Enhanced Ticket Management System for Optimized Support. Proceedings of the 4th International Conference on AI-ML Systems, p. 1-7, 2024. Disponível em: https://dl.acm.org/doi/10.1145/3703412.3703433. Acesso em: 20 maio 2026.

### Softwares e documentação de mercado

* ZENDESK. Definição de políticas de SLA. Disponível em: https://support.zendesk.com/hc/pt-br/articles/4408829459866-Definição-de-políticas-de-SLA. Acesso em: 20 maio 2026.
* FRESHSERVICE. Contract Management Setup Guide. Disponível em: https://support.freshservice.com/support/solutions/articles/204473-contract-management-setup-guide. Acesso em: 20 maio 2026.
* ATLASSIAN. Create service level agreements (SLAs) to manage goals. Disponível em: https://support.atlassian.com/jira-service-management-cloud/docs/create-service-level-agreements-slas/. Acesso em: 20 maio 2026.

### Documentos do projeto e da disciplina

* [Portfolio Directions Geral](https://github.com/CatolicaSC-Portfolio/The-Portfolio-Playbook/blob/main/directions/portfolio-directions-GERAL.md)
* [Portfolio Directions Web Apps](https://github.com/CatolicaSC-Portfolio/The-Portfolio-Playbook/blob/main/directions/portfolio-directions-webapp.md)
* [Portfolio.md - Disciplina de Portfólio](https://github.com/CatolicaSC-Portfolio/The-Portfolio-Playbook/blob/main/Portfolio.md)