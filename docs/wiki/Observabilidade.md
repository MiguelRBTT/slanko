# Observabilidade

RNF07: stack básica com **Prometheus** + **Grafana**.

## Componentes

| Serviço | URL | Função |
|---|---|---|
| App metrics | http://localhost:3000/api/metrics | Exposição Prometheus |
| Health | http://localhost:3000/api/health | Atualiza gauges de saúde/MySQL |
| Prometheus | http://localhost:9090 | Coleta e armazena séries |
| Grafana | http://localhost:3001 | Dashboards (admin / slanko) |

## Subir a stack

Com a app rodando (`npm run dev` na porta 3000):

```bash
docker compose up -d
```

Isso sobe MySQL, Prometheus e Grafana.

## Métricas principais

* `slanko_health_status` — 1=ok, 0=degraded
* `slanko_database_up` — 1=up, 0=down
* `slanko_health_checks_total` — contador de `/api/health`
* `slanko_metrics_scrapes_total` — scrapes de `/api/metrics`
* `slanko_process_*` — CPU/memória do processo Node (default metrics)

## Dashboard

No Grafana: pasta **Slanko** → **Slanko Overview** (provisionado automaticamente).

Datasource Prometheus: `http://slanko-prometheus:9090` (rede Docker).

## Arquivos

* `docker/prometheus/prometheus.yml`
* `docker/grafana/provisioning/`
* `src/lib/observability/metrics.ts`
* `src/app/api/metrics/route.ts`
