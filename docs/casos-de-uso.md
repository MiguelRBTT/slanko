# Casos de Uso - Slanko

## Diagrama

![Diagrama de Casos de Uso do Slanko](assets/diagrama-casos-de-uso.png)

## Atores

| Ator | Descrição |
|---|---|
| **Gestor** | Responsável por clientes, contratos, metas de SLA e indicadores de rentabilidade. Também pode operar chamados e registrar horas quando atuar no atendimento. |
| **Técnico** | Responsável por abrir/atualizar chamados, registrar horas e encerrar atendimentos. |

## Lista de casos de uso

| ID | Caso de uso | Ator principal | Fluxo de negócio |
|---|---|---|---|
| UC01 | Autenticar no sistema | Gestor, Técnico | Transversal |
| UC02 | Gerenciar clientes | Gestor | Chamados (base) |
| UC03 | Gerenciar contratos | Gestor | Chamados (base) |
| UC04 | Configurar metas de SLA | Gestor | SLA |
| UC05 | Abrir chamado | Gestor, Técnico | Chamados |
| UC06 | Atribuir chamado | Gestor | Chamados |
| UC07 | Registrar horas | Gestor, Técnico | Chamados / Rentabilidade |
| UC08 | Encerrar chamado | Gestor, Técnico | Chamados / SLA |
| UC09 | Consultar painel de SLA | Gestor | SLA |
| UC10 | Consultar rentabilidade | Gestor | Rentabilidade |
| UC11 | Visualizar dashboard | Gestor | SLA / Rentabilidade |

## Relacionamentos

* Todos os casos de uso de operação **incluem** `UC01 Autenticar no sistema` (autorização por perfil).
* `UC03` depende de cliente existente (`UC02`).
* `UC04`, `UC05` e indicadores dependem de contrato (`UC03`).
* `UC07` alimenta o cálculo de rentabilidade (`UC10`).
* Eventos de `UC05`, `UC06` e `UC08` alimentam o cálculo de SLA (`UC09`).
* No diagrama, `UC06` aparece na coluna do **Gestor** (ator principal). `UC05`, `UC07` e `UC08` ficam na coluna de compartilhados.

## Descrição resumida

### UC01 - Autenticar no sistema
O usuário informa credenciais e recebe acesso conforme o perfil (gestor ou técnico), via JWT.

### UC02 - Gerenciar clientes
O gestor cadastra, edita e lista clientes atendidos pela microempresa.

### UC03 - Gerenciar contratos
O gestor cadastra contratos vinculados a clientes, com valor, vigência e dados básicos de escopo.

### UC04 - Configurar metas de SLA
O gestor define tempos de resposta e resolução por contrato.

### UC05 - Abrir chamado
Gestor ou técnico abre chamado com prioridade, categoria e vínculo a cliente/contrato.

### UC06 - Atribuir chamado
O gestor define o técnico responsável pelo atendimento.

### UC07 - Registrar horas
Gestor ou técnico registra o tempo trabalhado no chamado (base do custo operacional). Isso cobre o caso em que o próprio gestor atua no atendimento.

### UC08 - Encerrar chamado
Gestor ou técnico encerra o atendimento com registro de solução e histórico consultável.

### UC09 - Consultar painel de SLA
O gestor visualiza cumprimento, violações e indicadores por cliente, contrato e período.

### UC10 - Consultar rentabilidade
O gestor visualiza custo (horas x custo/hora), margem e alertas de contratos deficitários.

### UC11 - Visualizar dashboard
O gestor acessa visão consolidada de SLA e rentabilidade.

## Rastreabilidade com requisitos

| Caso de uso | Requisitos (RFC) |
|---|---|
| UC01 | RF01 |
| UC02 | RF02 |
| UC03 | RF03 |
| UC04 | RF08 |
| UC05 | RF04 |
| UC06 | RF05 |
| UC07 | RF06, RF11 |
| UC08 | RF07 |
| UC09 | RF09, RF10 |
| UC10 | RF11, RF12, RF13 |
| UC11 | RF13, RF14 |
