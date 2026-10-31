# Observabilidade

RNF07: **Prometheus** + **Grafana**, com métricas de saúde, de negócio e de segurança.

## Componentes

| Serviço | URL | Função |
|---|---|---|
| App metrics | https://localhost:3000/api/metrics | Exposição Prometheus (atualiza tudo a cada coleta; exige `Bearer METRICS_TOKEN`) |
| Health | https://localhost:3000/api/health | Saúde da app e do MySQL |
| Prometheus | http://localhost:9090 | Coleta e armazena séries |
| Grafana | http://localhost:3001 | Dashboards (admin / slanko) |

## Subir a stack

Com a app rodando (`npm run dev`, HTTPS na porta 3000):

```bash
docker compose up -d
```

Isso sobe MySQL, Prometheus e Grafana. O Prometheus coleta do `npm run dev` (job `slanko-app`, HTTPS) e do container `slanko-app` quando ele está no ar (`npm run app:up`, job `slanko-app-container`).

## Métricas

Saúde e processo:

* `slanko_health_status` — 1=ok, 0=degraded (atualizado a cada coleta)
* `slanko_database_up` — 1=up, 0=down
* `slanko_process_*` — CPU/memória do processo Node

Negócio (recalculadas a cada coleta):

* `slanko_tickets{status}` — chamados por situação
* `slanko_sla_breached_tickets{metric}` — chamados com SLA de resposta/resolução violado
* `slanko_sla_critical_contracts` — contratos em alerta de SLA (conformidade < 80% ou 3+ violações)
* `slanko_active_contracts`, `slanko_deficitary_contracts`, `slanko_contracts_margin_brl`

Erros e segurança:

* `slanko_api_errors_total{status_code}` — respostas de erro da API
* `slanko_login_attempts_total{result}` — logins `success`, `failure` e `blocked` (força bruta)

## Dashboard

No Grafana: pasta **Slanko** → **Slanko Overview** (provisionado automaticamente), com saúde, processo, indicadores de contratos, chamados por situação, SLA violado, erros e logins.

## Arquivos

* `docker/prometheus/prometheus.yml`
* `docker/grafana/provisioning/`
* `src/lib/observability/metrics.ts`
* `src/services/metrics.service.ts`
* `src/app/api/metrics/route.ts`
