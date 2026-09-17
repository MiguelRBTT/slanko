"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { getSession } from "@/lib/client/auth-session";
import type { PublicProfitabilitySummary } from "@/types/profitability";
import type { PublicSlaSummary } from "@/types/sla";
import styles from "./dashboard.module.css";

type SlaPayload = { summary: PublicSlaSummary };
type ProfitPayload = { summary: PublicProfitabilitySummary };

function formatRate(value: number | null): string {
  return value === null ? "n/d" : `${value.toFixed(1)}%`;
}

export default function DashboardPage() {
  const [sla, setSla] = useState<PublicSlaSummary | null>(null);
  const [profit, setProfit] = useState<PublicProfitabilitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGestor, setIsGestor] = useState(false);

  useEffect(() => {
    const session = getSession();
    const gestor = session?.user.role === "GESTOR";
    setIsGestor(Boolean(gestor));

    async function load() {
      if (!gestor) {
        setLoading(false);
        return;
      }

      try {
        const [slaResult, profitResult] = await Promise.all([
          apiRequest<SlaPayload>("/api/sla/summary"),
          apiRequest<ProfitPayload>("/api/profitability/summary"),
        ]);

        setSla(slaResult.summary);
        setProfit(profitResult.summary);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Falha ao carregar o painel");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (!isGestor) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <h1>Painel</h1>
          <p className="muted">
            Indicadores de SLA e rentabilidade ficam disponíveis para o perfil gestor. Como técnico,
            use a área de chamados para operar atendimentos.
          </p>
        </header>
      </section>
    );
  }

  if (loading) {
    return <div className={styles.loading}>Carregando indicadores…</div>;
  }

  const breachedTickets =
    sla?.tickets.filter(
      (ticket) => ticket.response.status === "BREACHED" || ticket.resolution.status === "BREACHED",
    ) ?? [];

  const deficitary = profit?.contracts.filter((contract) => contract.deficitary) ?? [];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Painel</h1>
          <p className="muted">Visão consolidada de cumprimento de SLA e margem por contrato.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className={styles.metrics}>
        <article className={`${styles.metric} panel`}>
          <p className={styles.metricLabel}>SLA resposta</p>
          <strong>{formatRate(sla?.response.complianceRate ?? null)}</strong>
          <p className="muted">
            {sla?.response.met ?? 0} ok, {sla?.response.breached ?? 0} violados,{" "}
            {sla?.response.pending ?? 0} pendentes
          </p>
        </article>

        <article className={`${styles.metric} panel`}>
          <p className={styles.metricLabel}>SLA resolução</p>
          <strong>{formatRate(sla?.resolution.complianceRate ?? null)}</strong>
          <p className="muted">
            {sla?.resolution.met ?? 0} ok, {sla?.resolution.breached ?? 0} violados,{" "}
            {sla?.resolution.pending ?? 0} pendentes
          </p>
        </article>

        <article className={`${styles.metric} panel`}>
          <p className={styles.metricLabel}>Margem total</p>
          <strong>R$ {profit?.totalMargin ?? "0.00"}</strong>
          <p className="muted">
            Custo R$ {profit?.totalCost ?? "0.00"}, {profit?.totalHours ?? "0.00"} h
          </p>
        </article>

        <article className={`${styles.metric} panel`}>
          <p className={styles.metricLabel}>Alertas</p>
          <strong>
            {(profit?.deficitaryContracts ?? 0) + breachedTickets.length}
          </strong>
          <p className="muted">
            {profit?.deficitaryContracts ?? 0} deficitários, {breachedTickets.length} SLA crítico
          </p>
        </article>
      </div>

      <div className={styles.grid}>
        <section className="panel">
          <div className={styles.sectionHead}>
            <h2>Contratos deficitários</h2>
            <span className="badge badge-danger">{deficitary.length}</span>
          </div>
          {deficitary.length === 0 ? (
            <p className="empty-state">Nenhum contrato com margem negativa no período.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Contrato</th>
                    <th>Valor</th>
                    <th>Custo</th>
                    <th>Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {deficitary.map((contract) => (
                    <tr key={contract.contractId}>
                      <td>
                        <strong>{contract.contractCode}</strong>
                        <div className="muted">{contract.contractTitle}</div>
                      </td>
                      <td>R$ {contract.contractValue}</td>
                      <td>R$ {contract.totalCost}</td>
                      <td>
                        <span className="badge badge-danger">R$ {contract.margin}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className={styles.sectionHead}>
            <h2>Violações de SLA</h2>
            <span className="badge badge-warn">{breachedTickets.length}</span>
          </div>
          {breachedTickets.length === 0 ? (
            <p className="empty-state">Nenhuma violação de resposta ou resolução.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Chamado</th>
                    <th>Resposta</th>
                    <th>Resolução</th>
                  </tr>
                </thead>
                <tbody>
                  {breachedTickets.slice(0, 8).map((ticket) => (
                    <tr key={ticket.ticketId}>
                      <td>
                        <strong>{ticket.title}</strong>
                        <div className="muted">{ticket.status}</div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            ticket.response.status === "BREACHED" ? "badge-danger" : "badge-neutral"
                          }`}
                        >
                          {ticket.response.status}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            ticket.resolution.status === "BREACHED"
                              ? "badge-danger"
                              : "badge-neutral"
                          }`}
                        >
                          {ticket.resolution.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
