# API

Todas as rotas (exceto health e login) exigem header:

```http
Authorization: Bearer <jwt>
```

## Endpoints

| Rota | Auth | Perfil |
|---|---|---|
| `GET /api/health` | Pública | — |
| `POST /api/auth/login` | Pública | — |
| `GET /api/users` | JWT | gestor ou técnico |
| `GET /api/users/:id` | JWT | gestor ou técnico |
| `GET /api/clients` | JWT | gestor |
| `POST /api/clients` | JWT | gestor |
| `GET /api/clients/:id` | JWT | gestor |
| `PUT /api/clients/:id` | JWT | gestor |
| `DELETE /api/clients/:id` | JWT | gestor (soft delete) |
| `GET /api/contracts` | JWT | gestor ou técnico |
| `POST /api/contracts` | JWT | gestor |
| `GET /api/contracts/:id` | JWT | gestor ou técnico |
| `PUT /api/contracts/:id` | JWT | gestor |
| `DELETE /api/contracts/:id` | JWT | gestor |
| `GET /api/tickets` | JWT | gestor ou técnico |
| `POST /api/tickets` | JWT | gestor ou técnico |
| `GET /api/tickets/:id` | JWT | gestor ou técnico |
| `PUT /api/tickets/:id` | JWT | gestor ou técnico |
| `GET /api/tickets/:id/time-entries` | JWT | gestor ou técnico |
| `POST /api/tickets/:id/time-entries` | JWT | gestor ou técnico |
| `GET /api/sla/summary` | JWT | gestor |
| `GET /api/sla/contracts/:id` | JWT | gestor |
| `GET /api/profitability/summary` | JWT | gestor |
| `GET /api/profitability/contracts/:id` | JWT | gestor |

## Filtros

* `GET /api/sla/summary` e rentabilidade: `clientId`, `contractId`, `startDate`, `endDate` (`YYYY-MM-DD`)
* Relatórios por contrato: `startDate`, `endDate`
* Rentabilidade filtra pelo `workedAt` das horas apontadas

## Login (exemplo)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"gestor@slanko.local\",\"password\":\"Slanko@123\"}"
```

Resposta tipica inclui `token` e `user` (`id`, `name`, `email`, `role`).
