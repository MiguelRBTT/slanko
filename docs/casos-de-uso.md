# Casos de Uso - Slanko

## Diagrama

![Diagrama de Casos de Uso do Slanko](assets/diagrama-casos-de-uso.png)

## Atores

| Ator | Descrição |
|---|---|
| **Gestor** | Responsável por clientes, contratos, metas de SLA, equipe (custo/hora) e indicadores de rentabilidade. Atribui chamados e define observadores. Também pode operar chamados e registrar horas quando atuar no atendimento. |
| **Técnico** | Responsável por abrir/atualizar chamados, registrar horas e encerrar atendimentos. Pode assumir para si um chamado ainda sem responsável. |

## Lista de casos de uso

| ID | Caso de uso | Ator principal | Fluxo de negócio |
|---|---|---|---|
| UC01 | Autenticar no sistema | Gestor, Técnico | Transversal |
| UC02 | Gerenciar clientes | Gestor | Chamados (base) |
| UC03 | Gerenciar contratos | Gestor | Chamados (base) |
| UC04 | Configurar metas de SLA | Gestor | SLA |
| UC05 | Abrir chamado | Gestor, Técnico | Chamados |
| UC06 | Atribuir chamado | Gestor | Chamados |
| UC07 | Registrar e corrigir horas | Gestor, Técnico | Chamados / Rentabilidade |
| UC08 | Encerrar chamado | Gestor, Técnico | Chamados / SLA |
| UC09 | Consultar painel de SLA | Gestor | SLA |
| UC10 | Consultar rentabilidade | Gestor | Rentabilidade |
| UC11 | Visualizar dashboard | Gestor | SLA / Rentabilidade |
| UC12 | Gerenciar equipe e custo/hora | Gestor | Rentabilidade (base) |
| UC13 | Consultar histórico do chamado | Gestor, Técnico | Chamados (auditoria) |
| UC14 | Anexar arquivos ao chamado | Gestor, Técnico | Chamados |
| UC15 | Assumir chamado sem responsável | Técnico | Chamados |

## Relacionamentos

* Todos os casos de uso de operação **incluem** `UC01 Autenticar no sistema` (autorização por perfil).
* `UC03` depende de cliente existente (`UC02`).
* `UC04`, `UC05` e indicadores dependem de contrato (`UC03`).
* `UC07` alimenta o cálculo de rentabilidade (`UC10`), usando o custo/hora definido em `UC12`.
* Eventos de `UC05`, `UC06`, `UC07`, `UC08`, `UC14` e `UC15` alimentam o cálculo de SLA (`UC09`) e o histórico (`UC13`).
* `UC15` é a forma restrita de `UC06`: o técnico só assume para si um chamado ainda sem responsável.
* No diagrama, `UC06` e `UC12` aparecem na coluna do **Gestor**, `UC15` na do **Técnico**, e `UC05`, `UC07`, `UC08`, `UC13` e `UC14` na coluna de compartilhados.

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
O gestor define o técnico responsável pelo atendimento e os observadores. O técnico pode apenas assumir para si um chamado ainda sem responsável.

### UC07 - Registrar e corrigir horas
Gestor ou técnico registra o tempo trabalhado no chamado (base do custo operacional), em minutos. O custo/hora de quem apontou fica gravado no apontamento. Quem apontou (ou o gestor) pode corrigir ou excluir o apontamento enquanto o chamado não está encerrado, e a correção fica no histórico.

### UC08 - Encerrar chamado
Gestor ou técnico encerra o atendimento com registro de solução e histórico consultável.

### UC09 - Consultar painel de SLA
O gestor visualiza cumprimento, violações e indicadores por cliente, contrato e período.

### UC10 - Consultar rentabilidade
O gestor visualiza custo (horas x custo/hora), margem e alertas de contratos deficitários.

### UC11 - Visualizar dashboard
O gestor acessa visão consolidada de SLA e rentabilidade, com filtros por situação, cliente, contrato e período, e alertas de contratos com SLA crítico ou no prejuízo.

### UC12 - Gerenciar equipe e custo/hora
O gestor cadastra pessoas, define perfil (gestor ou técnico) e custo por hora, desativa e redefine senha. O custo/hora é a base do cálculo de rentabilidade.

### UC13 - Consultar histórico do chamado
Gestor ou técnico com acesso ao chamado consulta todas as alterações registradas (abertura, situação, responsável, observadores, campos, tempo apontado e anexos), inclusive depois do encerramento.

### UC14 - Anexar arquivos ao chamado
Gestor ou técnico anexa imagens (até 5 MB) e vídeos (até 50 MB) ao chamado, no máximo 10 por chamado.

### UC15 - Assumir chamado sem responsável
O técnico assume para si um chamado que ainda não tem responsável. Atribuir a outra pessoa e definir observadores continua sendo do gestor (`UC06`).

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
| UC11 | RF10, RF13, RF14 |
| UC12 | RF01, RF11 |
| UC13 | RF07 |
| UC14 | RF04 |
| UC15 | RF05 |
