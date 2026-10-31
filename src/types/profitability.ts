import type { ContractStatus } from "@prisma/client";

export type PublicContractProfitability = {
  contractId: string;
  contractCode: string;
  contractTitle: string;
  clientId: string;
  contractStatus: ContractStatus;
  /** Valor mensal do contrato. */
  contractValue: string;
  /** Receita reconhecida no período (valor mensal proporcional aos dias de vigência). */
  revenue: string;
  /** Janela de receita (YYYY-MM-DD) ou null quando o período não cruza a vigência. */
  periodStart: string | null;
  periodEnd: string | null;
  totalHours: string;
  totalCost: string;
  margin: string;
  marginRate: number | null;
  deficitary: boolean;
};

export type PublicProfitabilitySummary = {
  totalContracts: number;
  deficitaryContracts: number;
  totalContractValue: string;
  totalRevenue: string;
  totalHours: string;
  totalCost: string;
  totalMargin: string;
  contracts: PublicContractProfitability[];
};

export type PublicContractProfitabilityReport = {
  contract: PublicContractProfitability;
  entries: Array<{
    timeEntryId: string;
    ticketId: string;
    userId: string;
    userName: string;
    hours: string;
    hourlyCost: string;
    cost: string;
    workedAt: string;
  }>;
};
