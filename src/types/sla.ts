import type { SlaAlertReason } from "@/lib/sla/alerts";

export type SlaComplianceStatus = "PENDING" | "MET" | "BREACHED";

export type SlaMetricEvaluation = {
  status: SlaComplianceStatus;
  elapsedMinutes: number | null;
  targetMinutes: number;
};

export type PublicTicketSlaEvaluation = {
  ticketId: string;
  contractId: string;
  title: string;
  status: string;
  openedAt: string;
  response: SlaMetricEvaluation;
  resolution: SlaMetricEvaluation;
};

export type PublicContractSlaAlert = {
  contractId: string;
  contractCode: string;
  contractTitle: string;
  totalTickets: number;
  breachedTickets: number;
  responseComplianceRate: number | null;
  resolutionComplianceRate: number | null;
  /** RF13: conformidade < 80% ou 3+ chamados com violação no período. */
  alert: boolean;
  alertReasons: SlaAlertReason[];
};

export type PublicSlaSummary = {
  totalTickets: number;
  response: {
    met: number;
    breached: number;
    pending: number;
    complianceRate: number | null;
  };
  resolution: {
    met: number;
    breached: number;
    pending: number;
    complianceRate: number | null;
  };
  tickets: PublicTicketSlaEvaluation[];
  contracts: PublicContractSlaAlert[];
};

export type PublicContractSlaReport = {
  contractId: string;
  contractCode: string;
  contractTitle: string;
  clientId: string;
  responseMinutes: number;
  resolutionMinutes: number;
  summary: Omit<PublicSlaSummary, "tickets" | "contracts">;
  tickets: PublicTicketSlaEvaluation[];
};
