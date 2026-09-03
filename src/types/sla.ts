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
};

export type PublicContractSlaReport = {
  contractId: string;
  contractCode: string;
  contractTitle: string;
  clientId: string;
  responseMinutes: number;
  resolutionMinutes: number;
  summary: Omit<PublicSlaSummary, "tickets">;
  tickets: PublicTicketSlaEvaluation[];
};
