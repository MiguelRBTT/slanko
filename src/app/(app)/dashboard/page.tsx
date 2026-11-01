"use client";

import { useEffect, useState } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { formatDateBR, formatHours, formatMoneyBRL, formatPercent } from "@/lib/client/format";
import {
  contractStatusBadgeClass,
  labelContractStatus,
  labelSlaCheck,
  labelTicketStatus,
  slaCheckBadgeClass,
} from "@/lib/client/labels";
import { getSession } from "@/lib/client/auth-session";
import type { PublicClient } from "@/types/client";
import type { PublicContract } from "@/types/contract";
import type { PublicProfitabilitySummary } from "@/types/profitability";
import type { SlaAlertReason } from "@/lib/sla/alerts";
import type { PublicSlaSummary, SlaMetricEvaluation } from "@/types/sla";
import styles from "./dashboard.module.css";

type SlaPayload = { summary: PublicSlaSummary };
type ProfitPayload = { summary: PublicProfitabilitySummary };
type ContractScope = "ACTIVE" | "SUSPENDED" | "FINISHED" | "ALL";
type Filters = {
  scope: ContractScope;
  clientId: string;
  contractId: string;
  startDate: string;
  endDate: string;
};

const ALERT_REASON_LABEL: Record<SlaAlertReason, string> = {
  LOW_RESPONSE_COMPLIANCE: "Resposta abaixo de 80%",
  LOW_RESOLUTION_COMPLIANCE: "Resolução abaixo de 80%",
  RECURRING_BREACHES: "3+ chamados fora do prazo",
};

function filtersToQuery(filters: Filters): string {
  const params = new URLSearchParams({ status: filters.scope });
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.contractId) params.set("contractId", filters.contractId);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  return `?${params.toString()}`;
}

const CONTRACT_SCOPES: Array<{ value: ContractScope; label: string }> = [
  { value: "ACTIVE", label: "Contratos ativos" },
  { value: "SUSPENDED", label: "Contratos suspensos" },
  { value: "FINISHED", label: "Contratos finalizados" },
  { value: "ALL", label: "Todos (exceto rascunhos)" },
];

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

  return `${met} dentro do prazo e ${breached} fora, de ${evaluated} já medidos. ${pending} ainda dentro do prazo e sem ${kind} não entram na conta.`;
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

function revenuePeriodLabel(start: string | null, end: string | null): string {
  if (!start || !end) {
    return "vigência ainda não começou";
  }

  return `${formatDateBR(start)} a ${formatDateBR(end)}`;
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
  const [filters, setFilters] = useState<Filters>({
    scope: "ACTIVE",
    clientId: "",
    contractId: "",
    startDate: "",
    endDate: "",
  });
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [contractOptions, setContractOptions] = useState<PublicContract[]>([]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      // Trocar de cliente limpa o contrato escolhido, que pode ser de outro cliente.
      ...(key === "clientId" ? { contractId: "" } : {}),
    }));
  }

  useEffect(() => {
    if (getSession()?.user.role !== "GESTOR") return;

    Promise.all([
      apiRequest<{ clients: PublicClient[] }>("/api/clients"),
      apiRequest<{ contracts: PublicContract[] }>("/api/contracts"),
    ])
      .then(([clientsResult, contractsResult]) => {
        setClients(clientsResult.clients);
        setContractOptions(contractsResult.contracts.filter((contract) => contract.status !== "DRAFT"));
      })
      .catch(() => undefined);
  }, []);

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
        setError(null);
        const query = filtersToQuery(filters);
        const [slaResult, profitResult] = await Promise.all([
          apiRequest<SlaPayload>(`/api/sla/summary${query}`),
          apiRequest<ProfitPayload>(`/api/profitability/summary${query}`),
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
  }, [filters]);

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
  const slaAlerts = (sla?.contracts ?? []).filter((contract) => contract.alert);
  const visibleContractOptions = contractOptions.filter(
    (contract) => !filters.clientId || contract.clientId === filters.clientId,
  );
  const hasPeriod = Boolean(filters.startDate || filters.endDate);
  const scopeLabel = CONTRACT_SCOPES.find((item) => item.value === filters.scope)?.label ?? "";
  const periodLabel = hasPeriod
    ? `de ${filters.startDate ? formatDateBR(filters.startDate) : "início"} a ${filters.endDate ? formatDateBR(filters.endDate) : "hoje"}`
    : "desde o início de cada contrato até hoje";
  const deficitaryCount = profit?.deficitaryContracts ?? 0;
  const marginValue = Number(profit?.totalMargin ?? 0);

  function complianceTone(rate: number | null | undefined): string {
    return rate !== null && rate !== undefined && rate < 80 ? styles.toneWarn : "";
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Painel</h1>
          <p className={styles.subtitle}>
            {scopeLabel}, {periodLabel}.
          </p>
        </div>
      </header>

      <section className={`${styles.filters} panel`} aria-label="Filtros do painel">
        <div className="field">
          <label htmlFor="contract-scope">Situação</label>
          <select
            id="contract-scope"
            value={filters.scope}
            onChange={(e) => updateFilter("scope", e.target.value as ContractScope)}
          >
            {CONTRACT_SCOPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-client">Cliente</label>
          <select id="filter-client" value={filters.clientId} onChange={(e) => updateFilter("clientId", e.target.value)}>
            <option value="">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-contract">Contrato</label>
          <select
            id="filter-contract"
            value={filters.contractId}
            onChange={(e) => updateFilter("contractId", e.target.value)}
          >
            <option value="">Todos</option>
            {visibleContractOptions.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.code}: {contract.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-start">De</label>
          <input
            id="filter-start"
            type="date"
            value={filters.startDate}
            onChange={(e) => updateFilter("startDate", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="filter-end">Até</label>
          <input
            id="filter-end"
            type="date"
            value={filters.endDate}
            onChange={(e) => updateFilter("endDate", e.target.value)}
          />
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className={`${styles.metrics} panel`}>
        <article className={`${styles.metric} ${styles.metricPrimary}`}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>Margem dos contratos</p>
            <InfoTip
              align="start"
              label="O que é a margem"
              text={`Receita reconhecida no período (valor mensal proporcional aos dias de vigência) menos o custo das horas apontadas (${formatHours(profit?.totalHours ?? 0)}). O custo de cada apontamento usa o custo por hora de quem trabalhou na data em que o tempo foi registrado.`}
            />
          </div>
          <strong className={marginValue < 0 ? styles.toneDanger : ""}>
            {formatMoneyBRL(profit?.totalMargin ?? 0)}
          </strong>
          <p className={styles.metricNote}>
            Receita {formatMoneyBRL(profit?.totalRevenue ?? 0)}, custo {formatMoneyBRL(profit?.totalCost ?? 0)}
          </p>
        </article>

        <article className={styles.metric}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>Resposta no prazo</p>
            <InfoTip
              label="O que é a resposta no prazo"
              text={`Percentual dos chamados respondidos dentro do prazo do contrato. Chamado sem resposta que já passou do prazo conta como fora do prazo. Conta o tempo de calendário entre a abertura e o início do atendimento, não os minutos de trabalho. ${rateSentence(sla?.response.met ?? 0, sla?.response.breached ?? 0, sla?.response.pending ?? 0, "resposta")}`}
            />
          </div>
          <strong className={complianceTone(sla?.response.complianceRate)}>
            {formatPercent(sla?.response.complianceRate ?? null)}
          </strong>
        </article>

        <article className={styles.metric}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>Resolução no prazo</p>
            <InfoTip
              label="O que é a resolução no prazo"
              text={`Percentual dos chamados resolvidos dentro do prazo do contrato. Chamado ainda aberto que já passou do prazo conta como fora do prazo. Conta o tempo de calendário da abertura até marcar como resolvido. ${rateSentence(sla?.resolution.met ?? 0, sla?.resolution.breached ?? 0, sla?.resolution.pending ?? 0, "resolução")}`}
            />
          </div>
          <strong className={complianceTone(sla?.resolution.complianceRate)}>
            {formatPercent(sla?.resolution.complianceRate ?? null)}
          </strong>
        </article>

        <article className={styles.metric}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>Contratos no prejuízo</p>
            <InfoTip
              align="end"
              label="O que são contratos no prejuízo"
              text={`De ${profit?.totalContracts ?? 0} contrato(s) no filtro, quantos têm custo de horas maior que a receita reconhecida. Há também ${breachedTickets.length} chamado(s) com prazo estourado.`}
            />
          </div>
          <strong className={deficitaryCount > 0 ? styles.toneDanger : ""}>{deficitaryCount}</strong>
        </article>

        <article className={styles.metric}>
          <div className={styles.metricHead}>
            <p className={styles.metricLabel}>SLA crítico</p>
            <InfoTip
              align="end"
              label="O que é SLA crítico"
              text="Contratos com conformidade de resposta ou de resolução abaixo de 80%, ou com 3 ou mais chamados fora do prazo no período filtrado."
            />
          </div>
          <strong className={slaAlerts.length > 0 ? styles.toneDanger : ""}>{slaAlerts.length}</strong>
        </article>
      </div>

      {slaAlerts.length > 0 ? (
        <section className="panel">
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>
              <h2>Contratos com SLA crítico</h2>
            </div>
          </div>
          <ul className={styles.alertList}>
            {slaAlerts.map((alert) => (
              <li key={alert.contractId} className={styles.alertItem}>
                <div className={styles.alertContract}>
                  <strong>{alert.contractCode}</strong>
                  <span className="muted">{alert.contractTitle}</span>
                </div>
                <dl className={styles.alertStats}>
                  <div>
                    <dt>Resposta no prazo</dt>
                    <dd className={complianceTone(alert.responseComplianceRate)}>
                      {formatPercent(alert.responseComplianceRate)}
                    </dd>
                  </div>
                  <div>
                    <dt>Resolução no prazo</dt>
                    <dd className={complianceTone(alert.resolutionComplianceRate)}>
                      {formatPercent(alert.resolutionComplianceRate)}
                    </dd>
                  </div>
                  <div>
                    <dt>Fora do prazo</dt>
                    <dd>
                      {alert.breachedTickets} de {alert.totalTickets}
                    </dd>
                  </div>
                </dl>
                <div className={styles.alertReasons}>
                  {alert.alertReasons.map((reason) => (
                    <span key={reason} className="badge badge-danger">
                      {ALERT_REASON_LABEL[reason]}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>
            <h2>Cada contrato</h2>
            <InfoTip
              align="start"
              label="O que mostra cada contrato"
              text="Valor mensal é a mensalidade do contrato. Receita é esse valor proporcional aos dias de vigência até hoje. Custo é só das horas apontadas nos chamados desse contrato. Margem é a receita menos esse custo."
            />
          </div>
        </div>
        {contracts.length === 0 ? (
          <p className="empty-state">Nenhum contrato nessa situação para calcular.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th className="cell-num">Valor mensal</th>
                  <th className="cell-num">{hasPeriod ? "Receita no período" : "Receita até hoje"}</th>
                  <th className="cell-num">Horas apontadas</th>
                  <th className="cell-num">Custo das horas</th>
                  <th className="cell-num">Margem</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.contractId}>
                    <td>
                      <strong>{contract.contractCode}</strong>
                      <div className="muted">{contract.contractTitle}</div>
                      {contract.contractStatus !== "ACTIVE" ? (
                        <span className={contractStatusBadgeClass(contract.contractStatus)}>
                          {labelContractStatus(contract.contractStatus)}
                        </span>
                      ) : null}
                    </td>
                    <td className="cell-num">{formatMoneyBRL(contract.contractValue)}</td>
                    <td className="cell-num">
                      {formatMoneyBRL(contract.revenue)}
                      <div className="muted">{revenuePeriodLabel(contract.periodStart, contract.periodEnd)}</div>
                    </td>
                    <td className="cell-num">{formatHours(contract.totalHours)}</td>
                    <td className="cell-num">{formatMoneyBRL(contract.totalCost)}</td>
                    <td className="cell-num">
                      <strong className={contract.deficitary ? styles.toneDanger : ""}>
                        {formatMoneyBRL(contract.margin)}
                      </strong>
                      <div className="muted">
                        {contract.marginRate === null
                          ? "sem receita no período"
                          : contract.deficitary
                            ? "custo passou da receita"
                            : `${formatPercent(contract.marginRate)} da receita sobra`}
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
          <div>
            <div className={styles.sectionTitle}>
              <h2>Chamados com prazo estourado</h2>
              <InfoTip
                align="start"
                label="O que é prazo estourado"
                text="Mostra chamados que passaram do prazo de resposta ou de resolução. O tempo ao lado é de calendário, entre abrir e responder ou resolver. Não é o tempo de trabalho apontado em minutos."
              />
            </div>
            <p className={`muted ${styles.sectionCount}`}>
              {breachedTickets.length === 0
                ? "Nenhum chamado fora do prazo"
                : breachedTickets.length === 1
                  ? "1 chamado fora do prazo"
                  : `${breachedTickets.length} chamados fora do prazo`}
            </p>
          </div>
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
