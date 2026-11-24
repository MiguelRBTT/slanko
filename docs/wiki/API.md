# API

Todas as rotas exigem o header abaixo, exceto `health` e `login` (públicas) e `metrics` (que usa o `METRICS_TOKEN` do Prometheus):

```http
Authorization: Bearer <jwt>
```

## Endpoints

| Rota | Auth | Perfil |
|---|---|---|
| `GET /api/health` | Pública | — |
| `GET /api/metrics` | Token `METRICS_TOKEN` (Bearer), quando definido | — (Prometheus) |
| `POST /api/auth/login` | Pública | — (429 após 5 falhas em 15 min) |
| `GET /api/users` | JWT | gestor ou técnico (`includeInactive=true`: gestor) |
| `POST /api/users` | JWT | gestor |
| `GET /api/users/:id` | JWT | gestor ou técnico |
| `PUT /api/users/:id` | JWT | gestor (dados, custo/hora, situação, nova senha) |
| `GET /api/clients` | JWT | gestor (`includeInactive=true` traz os inativos) |
| `POST /api/clients` | JWT | gestor |
| `GET /api/clients/:id` | JWT | gestor |
| `PUT /api/clients/:id` | JWT | gestor |
| `DELETE /api/clients/:id` | JWT | gestor (desativa o cliente) |
| `GET /api/contracts` | JWT | gestor ou técnico |
| `POST /api/contracts` | JWT | gestor |
| `GET /api/contracts/:id` | JWT | gestor ou técnico |
| `PUT /api/contracts/:id` | JWT | gestor |
| `DELETE /api/contracts/:id` | JWT | gestor |
| `GET /api/tickets` | JWT | gestor ou técnico |
| `POST /api/tickets` | JWT | gestor ou técnico |
| `GET /api/tickets/:id` | JWT | gestor ou técnico |
| `PUT /api/tickets/:id` | JWT | gestor ou técnico |
| `DELETE /api/tickets/:id` | JWT | gestor ou técnico (só sem tempo apontado e não resolvido) |
| `GET /api/tickets/:id/events` | JWT | gestor ou técnico (histórico) |
| `GET /api/tickets/:id/time-entries` | JWT | gestor ou técnico |
| `POST /api/tickets/:id/time-entries` | JWT | gestor ou técnico |
| `PUT /api/tickets/:id/time-entries/:entryId` | JWT | autor do apontamento ou gestor |
| `DELETE /api/tickets/:id/time-entries/:entryId` | JWT | autor do apontamento ou gestor |
| `GET /api/tickets/:id/attachments` | JWT | gestor ou técnico |
| `POST /api/tickets/:id/attachments` | JWT | gestor ou técnico (multipart `file`) |
| `DELETE /api/tickets/:id/attachments/:attachmentId` | JWT | gestor ou técnico |
| `GET /api/tickets/:id/attachments/:attachmentId/file` | JWT | gestor ou técnico |
| `GET /api/sla/summary` | JWT | gestor |
| `GET /api/sla/contracts/:id` | JWT | gestor |
| `GET /api/profitability/summary` | JWT | gestor |
| `GET /api/profitability/contracts/:id` | JWT | gestor |

## Filtros

* `GET /api/tickets`: `contractId`, `status`, `assignedToId`, `priority`
* `GET /api/sla/summary` e `GET /api/profitability/summary`: `clientId`, `contractId`, `startDate`, `endDate` (`YYYY-MM-DD`)
* Resumos de SLA e rentabilidade: `status=ACTIVE|SUSPENDED|FINISHED|ALL` (padrão `ACTIVE`; rascunhos nunca entram)
* Relatórios por contrato: `startDate`, `endDate` (qualquer contrato, exceto rascunho)
* Técnico não recebe `hourlyCost` de outros usuários nem `value` de contratos
* Rentabilidade filtra o custo pelo `workedAt` das horas apontadas e calcula a receita proporcional do mesmo período (valor mensal × dias de vigência)

## Login (exemplo)

```bash
curl -k -X POST https://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"gestor@slanko.local\",\"password\":\"Slanko@123\"}"
```

A resposta traz o `token` e o `user` (`id`, `name`, `email`, `role`, `hourlyCost`, `active`). Com `npm run dev:http`, use `http://localhost:3000` sem o `-k`.
