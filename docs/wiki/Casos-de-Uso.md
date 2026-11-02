# Casos de Uso

## Atores

| Ator | Descrição |
|---|---|
| **Gestor** | Clientes, contratos, metas de SLA, equipe (custo/hora), indicadores, atribuição e operação de chamados |
| **Técnico** | Abrir/atualizar chamados, assumir chamado sem responsável, registrar horas e encerrar atendimentos |

## Lista

| ID | Caso de uso | Ator principal |
|---|---|---|
| UC01 | Autenticar no sistema | Gestor, Técnico |
| UC02 | Gerenciar clientes | Gestor |
| UC03 | Gerenciar contratos | Gestor |
| UC04 | Configurar metas de SLA | Gestor |
| UC05 | Abrir chamado | Gestor, Técnico |
| UC06 | Atribuir chamado | Gestor |
| UC07 | Registrar e corrigir horas | Gestor, Técnico |
| UC08 | Encerrar chamado | Gestor, Técnico |
| UC09 | Consultar painel de SLA | Gestor |
| UC10 | Consultar rentabilidade | Gestor |
| UC11 | Visualizar dashboard | Gestor |
| UC12 | Gerenciar equipe e custo/hora | Gestor |
| UC13 | Consultar histórico do chamado | Gestor, Técnico |
| UC14 | Anexar arquivos ao chamado | Gestor, Técnico |
| UC15 | Assumir chamado sem responsável | Técnico |

## Relacionamentos

* Operações incluem **UC01** (autenticação).
* Contratos dependem de cliente (**UC02** → **UC03**).
* Chamados e indicadores dependem de contrato.
* Horas (**UC07**) alimentam rentabilidade (**UC10**), com o custo/hora definido em **UC12**.
* Abertura/atribuição/encerramento alimentam SLA (**UC09**) e o histórico (**UC13**).
* **UC15** é a forma restrita de **UC06**: o técnico só assume para si um chamado sem responsável.

Detalhamento e diagrama: [`docs/casos-de-uso.md`](https://github.com/MiguelRBTT/slanko/blob/main/docs/casos-de-uso.md).
