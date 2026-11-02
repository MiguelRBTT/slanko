# Modelagem de Dados - Slanko

Modelo relacional do banco MySQL do Slanko, alinhado ao [RFC](RFC.md), aos [casos de uso](casos-de-uso.md) e à arquitetura em camadas documentada no [C4](arquitetura-c4.md).

## Decisões de modelagem

* Banco: **MySQL** (persistência relacional real).
* Acesso: **Prisma** (ORM) na camada de dados.
* Metas de SLA são definidas no **contrato** (`response_minutes`, `resolution_minutes`) e **copiadas para o chamado** na abertura. Assim, mudar a meta do contrato não reescreve o SLA de chamados antigos, sem precisar de uma tabela própria de regras.
* O custo/hora segue a mesma ideia: fica no usuário e é copiado para cada apontamento.
* Horas trabalhadas ficam em `TimeEntry`, vinculadas ao chamado e ao usuário que apontou (gestor ou técnico).
* Nomes de tabelas no banco em `snake_case` (padrão Prisma/MySQL); no código TypeScript usam-se modelos em `PascalCase`.

## Diagrama entidade-relacionamento (DER)

![DER Slanko](assets/der-slanko.png)

## Visão geral das entidades

| Entidade | Tabela | Responsabilidade |
|---|---|---|
| User | `users` | Usuários do sistema (gestor e técnico), com custo/hora |
| Client | `clients` | Clientes da microempresa |
| Contract | `contracts` | Contratos com valor mensal, vigência e metas de SLA |
| Ticket | `tickets` | Chamados de suporte |
| TimeEntry | `time_entries` | Apontamento de horas por chamado, com o custo/hora vigente no apontamento |
| TicketEvent | `ticket_events` | Histórico auditável do chamado (RF07) |
| TicketObserver | `ticket_observers` | Observadores do chamado |
| TicketAttachment | `ticket_attachments` | Imagens e vídeos anexados ao chamado |

## Relacionamentos e cardinalidades

| Relacionamento | Cardinalidade | Descrição |
|---|---|---|
| Client → Contract | 1:N | Um cliente possui vários contratos |
| Contract → Ticket | 1:N | Um contrato possui vários chamados |
| User → Ticket (abertura) | 1:N | Um usuário abre vários chamados |
| User → Ticket (atribuição) | 1:N | Um técnico/gestor pode ser responsável por vários chamados |
| Ticket → TimeEntry | 1:N | Um chamado recebe vários apontamentos |
| User → TimeEntry | 1:N | Um usuário registra vários apontamentos |
| Ticket → TicketEvent | 1:N | Cada alteração do chamado gera um evento imutável |
| User → TicketEvent | 1:N | Autor de cada evento do histórico |
| Ticket ↔ User (observadores) | N:N | Resolvido pela tabela `ticket_observers` |
| Ticket → TicketAttachment | 1:N | Um chamado recebe vários anexos |
| User → TicketAttachment | 1:N | Quem enviou cada anexo |

```text
User 1 ──< Ticket (opened_by)
User 1 ──< Ticket (assigned_to)   [opcional até a atribuição]
Client 1 ──< Contract 1 ──< Ticket 1 ──< TimeEntry >── 1 User
Ticket 1 ──< TicketObserver >── 1 User
Ticket 1 ──< TicketAttachment >── 1 User (uploaded_by)
Ticket 1 ──< TicketEvent >── 1 User (actor)
```

Observadores, anexos e eventos são apagados junto com o chamado (`ON DELETE CASCADE`), o que só acontece na exclusão de chamado aberto por engano.

## Dicionário de dados

### `users`

| Campo | Tipo | Nulo | Descrição |
|---|---|---|---|
| id | CHAR(36) / UUID | não | Identificador |
| name | VARCHAR(120) | não | Nome |
| email | VARCHAR(180) | não | E-mail (único) |
| password_hash | VARCHAR(255) | não | Hash da senha |
| role | ENUM(`GESTOR`,`TECNICO`) | não | Perfil de acesso |
| hourly_cost | DECIMAL(10,2) | não | Custo/hora do colaborador (base da rentabilidade) |
| active | BOOLEAN | não | Usuário ativo |
| created_at | DATETIME | não | Criação |
| updated_at | DATETIME | não | Atualização |

Índices: único em `email`.

### `clients`

| Campo | Tipo | Nulo | Descrição |
|---|---|---|---|
| id | CHAR(36) / UUID | não | Identificador |
| name | VARCHAR(180) | não | Razão social / nome |
| document | VARCHAR(32) | sim | CNPJ/CPF (opcional no MVP) |
| email | VARCHAR(180) | sim | Contato |
| phone | VARCHAR(40) | sim | Telefone |
| active | BOOLEAN | não | Cliente ativo |
| created_at | DATETIME | não | Criação |
| updated_at | DATETIME | não | Atualização |

### `contracts`

| Campo | Tipo | Nulo | Descrição |
|---|---|---|---|
| id | CHAR(36) / UUID | não | Identificador |
| client_id | CHAR(36) | não | FK → `clients.id` |
| code | VARCHAR(40) | não | Código interno do contrato (único) |
| title | VARCHAR(180) | não | Título |
| description | TEXT | sim | Escopo resumido |
| value | DECIMAL(12,2) | não | Valor **mensal** do contrato (mensalidade). A receita de um período é proporcional aos dias de vigência |
| start_date | DATE | não | Início da vigência |
| end_date | DATE | sim | Fim da vigência |
| status | ENUM(`DRAFT`,`ACTIVE`,`SUSPENDED`,`FINISHED`) | não | Situação |
| response_minutes | INT | não | Meta de SLA: tempo de 1ª resposta (minutos) |
| resolution_minutes | INT | não | Meta de SLA: tempo de resolução (minutos) |
| created_at | DATETIME | não | Criação |
| updated_at | DATETIME | não | Atualização |

Índices: único em `code`; índice em `client_id`, `status`.

### `tickets`

| Campo | Tipo | Nulo | Descrição |
|---|---|---|---|
| id | CHAR(36) / UUID | não | Identificador |
| contract_id | CHAR(36) | não | FK → `contracts.id` |
| opened_by_id | CHAR(36) | não | FK → `users.id` (quem abriu) |
| assigned_to_id | CHAR(36) | sim | FK → `users.id` (responsável) |
| title | VARCHAR(180) | não | Título do chamado |
| description | TEXT | não | Detalhamento |
| priority | ENUM(`LOW`,`MEDIUM`,`HIGH`,`CRITICAL`) | não | Prioridade |
| category | VARCHAR(80) | não | Categoria (ex.: rede, software, hardware) |
| status | ENUM(`OPEN`,`IN_PROGRESS`,`WAITING`,`RESOLVED`,`CLOSED`) | não | Status |
| opened_at | DATETIME | não | Abertura (início do SLA) |
| response_minutes | INT | não | Meta de resposta copiada do contrato na abertura |
| resolution_minutes | INT | não | Meta de resolução copiada do contrato na abertura |
| first_response_at | DATETIME | sim | Momento da 1ª resposta (SLA de resposta) |
| resolved_at | DATETIME | sim | Momento da resolução (SLA de resolução) |
| closed_at | DATETIME | sim | Encerramento |
| solution | TEXT | sim | Registro da solução |
| created_at | DATETIME | não | Criação |
| updated_at | DATETIME | não | Atualização |

Índices: `contract_id`, `status`, `assigned_to_id`, `opened_at`.

### `time_entries`

| Campo | Tipo | Nulo | Descrição |
|---|---|---|---|
| id | CHAR(36) / UUID | não | Identificador |
| ticket_id | CHAR(36) | não | FK → `tickets.id` |
| user_id | CHAR(36) | não | FK → `users.id` (quem apontou) |
| hours | DECIMAL(10,4) | não | Horas trabalhadas (> 0); a interface registra em minutos |
| hourly_cost | DECIMAL(10,2) | não | Custo/hora de quem apontou, copiado de `users.hourly_cost` no momento do apontamento |
| note | VARCHAR(255) | sim | Observação do apontamento |
| worked_at | DATETIME | não | Data/hora do trabalho |
| created_at | DATETIME | não | Criação |
| updated_at | DATETIME | não | Atualização |

Índices: `ticket_id`, `user_id`, `worked_at`.

### `ticket_events`

| Campo | Tipo | Nulo | Descrição |
|---|---|---|---|
| id | CHAR(36) / UUID | não | Identificador |
| sequence | INT | não | Auto incremento (único); ordem de gravação dos eventos |
| ticket_id | CHAR(36) | não | FK → `tickets.id` |
| actor_id | CHAR(36) | não | FK → `users.id` (quem fez a alteração) |
| type | ENUM(`CREATED`,`UPDATED`,`STATUS_CHANGED`,`ASSIGNEE_CHANGED`,`OBSERVERS_CHANGED`,`TIME_LOGGED`,`TIME_UPDATED`,`TIME_DELETED`,`ATTACHMENT_ADDED`,`ATTACHMENT_REMOVED`) | não | Tipo do evento |
| data | JSON | sim | Detalhes (valores antes/depois, minutos apontados, arquivo) |
| created_at | DATETIME | não | Momento do evento |

Índices: único em `sequence`; (`ticket_id`, `created_at`). Eventos da mesma alteração têm o mesmo horário, por isso a ordem vem de `sequence`. Os eventos são gravados na mesma escrita/transação da alteração que descrevem.

### `ticket_observers`

| Campo | Tipo | Nulo | Descrição |
|---|---|---|---|
| ticket_id | CHAR(36) | não | FK → `tickets.id` |
| user_id | CHAR(36) | não | FK → `users.id` (observador) |
| created_at | DATETIME | não | Quando passou a observar |

Chave primária composta (`ticket_id`, `user_id`): a mesma pessoa não observa o chamado duas vezes. Observadores são definidos pelo gestor (UC06).

### `ticket_attachments`

| Campo | Tipo | Nulo | Descrição |
|---|---|---|---|
| id | CHAR(36) / UUID | não | Identificador |
| ticket_id | CHAR(36) | não | FK → `tickets.id` |
| uploaded_by_id | CHAR(36) | não | FK → `users.id` (quem enviou) |
| kind | ENUM(`IMAGE`,`VIDEO`) | não | Tipo do anexo |
| file_name | VARCHAR(191) | não | Nome original do arquivo |
| mime_type | VARCHAR(191) | não | Tipo do conteúdo, conferido pelos primeiros bytes do arquivo |
| size_bytes | INT | não | Tamanho (imagem até 5 MB, vídeo até 50 MB) |
| storage_key | VARCHAR(191) | não | Nome do arquivo no volume `uploads` |
| created_at | DATETIME | não | Envio |

Índice: `ticket_id`. O arquivo fica no volume `uploads`; o banco guarda só os metadados. Máximo de 10 anexos por chamado.

## Regras de negócio derivadas do modelo

### SLA
* Meta de resposta e resolução são as do chamado (`tickets.response_minutes` e `tickets.resolution_minutes`), copiadas do contrato na abertura.
* O relógio começa na abertura (`opened_at`). A 1ª resposta (`first_response_at`) é o início do atendimento: o chamado sai de `OPEN` (andamento, aguardando, resolvido ou encerrado) ou recebe o 1º apontamento de tempo. Atribuir responsável sozinho não conta (mesmo critério de Zendesk, Jira Service Management e Freshdesk).
* Cumprimento de resposta: diferença entre `tickets.first_response_at` e `tickets.opened_at`.
* Cumprimento de resolução: diferença entre `tickets.resolved_at` (ou `closed_at`, se encerrado sem passar por resolvido) e `tickets.opened_at`.
* Violação: tempo decorrido maior que a meta do contrato. **Sem resposta/resolução e com o prazo já vencido, o chamado já conta como violado**; só fica pendente (fora do percentual) enquanto ainda está dentro do prazo.
* Tempo de calendário (24×7), sem pausa em `WAITING` e sem horário comercial (decisão do MVP).
* As metas são copiadas do contrato para o chamado na abertura (`tickets.response_minutes` e `tickets.resolution_minutes`): alterar a meta do contrato vale só para chamados novos.
* Alerta de SLA por contrato (RF13): conformidade de resposta ou de resolução abaixo de 80%, ou 3 ou mais chamados com violação no período filtrado.
* Relatórios consideram contratos `ACTIVE` por padrão e aceitam `status=SUSPENDED|FINISHED|ALL` (rascunhos nunca entram); o relatório por contrato aceita qualquer situação exceto rascunho.

### Rentabilidade
* Custo de um apontamento: `time_entries.hours * time_entries.hourly_cost` (custo/hora congelado no apontamento; reajustes futuros não reescrevem o passado).
* Custo operacional do contrato: soma dos custos dos apontamentos dos chamados daquele contrato no período.
* Receita do período: `contracts.value` é mensal; para cada mês, soma `valor_mensal × dias de vigência no mês / dias do mês`. A janela é a vigência ∩ período consultado, limitada a hoje. Sem filtro, vai do início do contrato até hoje.
* Margem: `receita_do_período - custo_operacional`; percentual sobre a receita.
* Contrato deficitário: margem negativa (alerta no dashboard).

### Apontamentos
* Data do trabalho entre o dia de abertura do chamado e hoje; no máximo 24 h por apontamento.
* Quem apontou (ou o gestor) pode corrigir ou excluir o apontamento enquanto o chamado não está encerrado; cada correção gera `TIME_UPDATED`/`TIME_DELETED` no histórico com os valores anteriores.

### Histórico e exclusão de chamados
* Toda alteração de chamado (abertura, situação, responsável, observadores, campos, tempo apontado e anexos) gera um `ticket_events`.
* Exclusão física só é aceita para chamados abertos por engano: sem tempo apontado e ainda não resolvidos/encerrados.

### Autorização (alto nível)
* `GESTOR`: clientes, contratos, equipe (custo/hora), SLA, atribuição, indicadores e operação de chamados/horas.
* `TECNICO`: abertura/atualização de chamados, apontamento de horas e encerramento. Pode assumir para si um chamado sem responsável, mas não atribui a terceiros nem altera observadores (UC06). Não recebe custo/hora de colegas nem valor de contratos.
* Chamados só podem ser abertos em contratos `ACTIVE` e vigentes na data de hoje.

## Rastreabilidade

| Entidade | Casos de uso | Requisitos |
|---|---|---|
| User | UC01, UC12 | RF01, RF11 |
| Client | UC02 | RF02 |
| Contract | UC03, UC04 | RF03, RF08 |
| Ticket | UC05, UC06, UC08, UC09, UC15 | RF04, RF05, RF07, RF09, RF10 |
| TimeEntry | UC07, UC10 | RF06, RF11, RF12 |
| TicketEvent | UC13 | RF07 |
| TicketObserver | UC06 | RF05 |
| TicketAttachment | UC14 | RF04 |

## Schema Prisma

O schema completo, com enums, índices e relações, está em [`prisma/schema.prisma`](../prisma/schema.prisma). As migrations ficam em `prisma/migrations/` e o seed de demonstração em `prisma/seed.js`.

## Próximos passos técnicos

1. Se as metas de SLA passarem a variar por prioridade, criar uma tabela de metas por contrato e prioridade (o chamado continua guardando a meta copiada).
2. Manter este documento e o DER atualizados a cada nova migration.
