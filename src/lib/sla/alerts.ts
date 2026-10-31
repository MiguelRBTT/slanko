// RF13: contrato com SLA crítico (regra fixa e documentada).
// Alerta quando a conformidade de resposta ou de resolução fica abaixo de 80%,
// ou quando 3 ou mais chamados tiveram violação no período filtrado.

export const SLA_ALERT_MIN_COMPLIANCE = 80;
export const SLA_ALERT_MAX_BREACHED_TICKETS = 3;

export type SlaAlertReason = "LOW_RESPONSE_COMPLIANCE" | "LOW_RESOLUTION_COMPLIANCE" | "RECURRING_BREACHES";

export function slaAlertReasons(input: {
  responseComplianceRate: number | null;
  resolutionComplianceRate: number | null;
  breachedTickets: number;
}): SlaAlertReason[] {
  const reasons: SlaAlertReason[] = [];

  if (input.responseComplianceRate !== null && input.responseComplianceRate < SLA_ALERT_MIN_COMPLIANCE) {
    reasons.push("LOW_RESPONSE_COMPLIANCE");
  }

  if (input.resolutionComplianceRate !== null && input.resolutionComplianceRate < SLA_ALERT_MIN_COMPLIANCE) {
    reasons.push("LOW_RESOLUTION_COMPLIANCE");
  }

  if (input.breachedTickets >= SLA_ALERT_MAX_BREACHED_TICKETS) {
    reasons.push("RECURRING_BREACHES");
  }

  return reasons;
}
