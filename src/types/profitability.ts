export type PublicContractProfitability = {
  contractId: string;
  contractCode: string;
  contractTitle: string;
  clientId: string;
  contractValue: string;
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
