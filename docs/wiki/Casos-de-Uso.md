# Casos de Uso

## Atores

| Ator | Descrição |
|---|---|
| **Gestor** | Clientes, contratos, metas de SLA, indicadores e operação de chamados |
| **Técnico** | Abrir/atualizar chamados, registrar horas e encerrar atendimentos |

## Lista

| ID | Caso de uso | Ator principal |
|---|---|---|
| UC01 | Autenticar no sistema | Gestor, Técnico |
| UC02 | Gerenciar clientes | Gestor |
| UC03 | Gerenciar contratos | Gestor |
| UC04 | Configurar metas de SLA | Gestor |
| UC05 | Abrir chamado | Gestor, Técnico |
| UC06 | Atribuir chamado | Gestor |
| UC07 | Registrar horas | Gestor, Técnico |
| UC08 | Encerrar chamado | Gestor, Técnico |
| UC09 | Consultar painel de SLA | Gestor |
| UC10 | Consultar rentabilidade | Gestor |
| UC11 | Visualizar dashboard | Gestor |

## Relacionamentos

* Operações incluem **UC01** (autenticação).
* Contratos dependem de cliente (**UC02** → **UC03**).
* Chamados e indicadores dependem de contrato.
* Horas (**UC07**) alimentam rentabilidade (**UC10**).
* Abertura/atribuição/encerramento alimentam SLA (**UC09**).

Detalhamento e diagrama: [`docs/casos-de-uso.md`](https://github.com/MiguelRBTT/slanko/blob/main/docs/casos-de-uso.md).
