"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { formatHours, formatMoneyBRL, formatPercent } from "@/lib/client/format";
import { labelSlaCheck, labelTicketStatus, slaCheckBadgeClass } from "@/lib/client/labels";
import { getSession } from "@/lib/client/auth-session";
import type { PublicProfitabilitySummary } from "@/types/profitability";
import type { PublicSlaSummary, SlaMetricEvaluation } from "@/types/sla";
import styles from "./dashboard.module.css";

type SlaPayload = { summary: PublicSlaSummary };
type ProfitPayload = { summary: PublicProfitabilitySummary };

function formatDuration(minutes: number | null): string {
  if (minutes === null) {
    return "ainda não medido";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function rateSentence(met: number, breached: number, pending: number, kind: "resposta" | "resolução"): string {
  const evaluated = met + breached;

  if (evaluated === 0) {
    return pending > 0
      ? `${pending} chamado(s) ainda sem ${kind} medida. O percentual só aparece depois do primeiro prazo concluído.`
      : `Nenhum chamado para calcular a ${kind}.`;
  }

  return `${met} dentro do prazo e ${breached} fora, de ${evaluated} já medidos. ${pending} ainda pendente(s) não entram na conta.`;
}

function InfoTip({
  label,
  text,
  align = "center",
}: {
  label: string;
  text: string;
  align?: "start" | "center" | "end";
}) {
  const alignClass = align === "start" ? styles.tipStart : align === "end" ? styles.tipEnd : "";

  return (
    <span className={`${styles.tip} ${alignClass}`}>
      <button type="button" className={styles.tipButton} aria-label={label}>
        <span aria-hidden="true">?</span>
      </button>
      <span role="tooltip" className={styles.tipBubble}>
        {text}
      </span>
    </span>
  );
}

function slaDetail(check: SlaMetricEvaluation): string {
  if (check.status === "PENDING") {
    return `Prazo de ${formatDuration(check.targetMinutes)}`;
  }

  return `${formatDuration(check.elapsedMinutes)} / prazo ${formatDuration(check.targetMinutes)}`;
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
    return <div className={styles.loading}>Redirecionando para chamados…</div>;
  }

  if (loading) {
    return <div className={styles.loading}>Carregando indicadores…</div>;
  }

  const breachedTickets =
    sla?.tickets.filter(
      (ticket) => ticket.response.status === "BREACHED" || ticket.resolution.status === "BREACHED",
    ) ?? [];

  const contracts = profit?.contracts ?? [];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Painel</h1>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className={styles.metrics}>
        <article className={`${styles.metric} panel`}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>Prazo de resposta</p>
            <InfoTip
              align="start"
              label="O que é o prazo de resposta"
              text={`Percentual dos chamados já respondidos que ficaram dentro do prazo do contrato. Conta o tempo de calendário entre a abertura e o início do atendimento, não os minutos de trabalho. ${rateSentence(sla?.response.met ?? 0, sla?.response.breached ?? 0, sla?.response.pending ?? 0, "resposta")}`}
            />
          </div>
          <strong>{formatPercent(sla?.response.complianceRate ?? null)}</strong>
        </article>

        <article className={`${styles.metric} panel`}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>Prazo de resolução</p>
            <InfoTip
              label="O que é o prazo de resolução"
              text={`Percentual dos chamados já resolvidos que ficaram dentro do prazo do contrato. Conta o tempo de calendário da abertura até marcar como resolvido. ${rateSentence(sla?.resolution.met ?? 0, sla?.resolution.breached ?? 0, sla?.resolution.pending ?? 0, "resolução")}`}
            />
          </div>
          <strong>{formatPercent(sla?.resolution.complianceRate ?? null)}</strong>
        </article>

        <article className={`${styles.metric} panel`}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>Margem dos contratos</p>
            <InfoTip
              label="O que é a margem"
              text={`Valor cobrado (${formatMoneyBRL(profit?.totalContractValue ?? 0)}) menos o custo das horas apontadas (${formatMoneyBRL(profit?.totalCost ?? 0)}, ${formatHours(profit?.totalHours ?? 0)}). O custo é horas vezes o custo por hora de quem trabalhou.`}
            />
          </div>
          <strong>{formatMoneyBRL(profit?.totalMargin ?? 0)}</strong>
        </article>

        <article className={`${styles.metric} panel`}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>Contratos no prejuízo</p>
            <InfoTip
              align="end"
              label="O que são contratos no prejuízo"
              text={`De ${profit?.totalContracts ?? 0} contrato(s) ativo(s), quantos já têm custo de horas maior que o valor cobrado. Há também ${breachedTickets.length} chamado(s) com prazo estourado.`}
            />
          </div>
          <strong>{profit?.deficitaryContracts ?? 0}</strong>
        </article>
      </div>

      <section className="panel">
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>
            <h2>Cada contrato</h2>
            <InfoTip
              align="start"
              label="O que mostra cada contrato"
              text="Valor é o que o cliente paga. Custo é só das horas apontadas nos chamados desse contrato. Margem é o valor menos esse custo."
            />
          </div>
        </div>
        {contracts.length === 0 ? (
          <p className="empty-state">Nenhum contrato ativo para calcular.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Valor cobrado</th>
                  <th>Horas apontadas</th>
                  <th>Custo das horas</th>
                  <th>Margem</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.contractId}>
                    <td>
                      <strong>{contract.contractCode}</strong>
                      <div className="muted">{contract.contractTitle}</div>
                    </td>
                    <td>{formatMoneyBRL(contract.contractValue)}</td>
                    <td>{formatHours(contract.totalHours)}</td>
                    <td>{formatMoneyBRL(contract.totalCost)}</td>
                    <td>
                      <span className={contract.deficitary ? "badge badge-danger" : "badge badge-ok"}>
                        {formatMoneyBRL(contract.margin)}
                      </span>
                      <div className="muted">
                        {contract.marginRate === null
                          ? "sem valor para comparar"
                          : contract.deficitary
                            ? "custo passou do valor"
                            : `${formatPercent(contract.marginRate)} do valor ainda sobra`}
                      </div>
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
          <div className={styles.sectionTitle}>
            <h2>Chamados com prazo estourado</h2>
            <InfoTip
              align="start"
              label="O que é prazo estourado"
              text="Mostra chamados que passaram do prazo de resposta ou de resolução. O tempo ao lado é de calendário, entre abrir e responder ou resolver. Não é o tempo de trabalho apontado em minutos."
            />
          </div>
          <span className="badge badge-warn">{breachedTickets.length}</span>
        </div>
        {breachedTickets.length === 0 ? (
          <p className="empty-state">Nenhum chamado estourou o prazo de resposta ou de resolução.</p>
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
                {breachedTickets.map((ticket) => (
                  <tr key={ticket.ticketId}>
                    <td>
                      <strong>{ticket.title}</strong>
                      <div className="muted">{labelTicketStatus(ticket.status)}</div>
                    </td>
                    <td>
                      <span className={slaCheckBadgeClass(ticket.response.status)}>
                        {labelSlaCheck(ticket.response.status)}
                      </span>
                      <div className="muted">{slaDetail(ticket.response)}</div>
                    </td>
                    <td>
                      <span className={slaCheckBadgeClass(ticket.resolution.status)}>
                        {labelSlaCheck(ticket.resolution.status)}
                      </span>
                      <div className="muted">{slaDetail(ticket.resolution)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
