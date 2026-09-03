import {
  buildProfitabilityTotals,
  calculateContractProfitability,
  calculateEntryCost,
  toNumeric,
} from "@/lib/profitability/calculations";
import { NotFoundError } from "@/lib/errors/app-error";
import {
  ProfitabilityRepository,
  profitabilityRepository,
  type ProfitabilityFilters,
} from "@/repositories/profitability.repository";
import type {
  PublicContractProfitability,
  PublicContractProfitabilityReport,
  PublicProfitabilitySummary,
} from "@/types/profitability";

type ContractWithEntries = Awaited<ReturnType<ProfitabilityRepository["findActiveContracts"]>>[number];

function toContractProfitability(contract: ContractWithEntries): PublicContractProfitability {
  let totalHours = 0;
  let totalCost = 0;

  for (const ticket of contract.tickets) {
    for (const entry of ticket.timeEntries) {
      const hours = toNumeric(entry.hours);
      const hourlyCost = toNumeric(entry.user.hourlyCost);
      totalHours += hours;
      totalCost += calculateEntryCost(hours, hourlyCost);
    }
  }

  const metrics = calculateContractProfitability({
    contractValue: toNumeric(contract.value),
    totalHours,
    totalCost,
  });

  return {
    contractId: contract.id,
    contractCode: contract.code,
    contractTitle: contract.title,
    clientId: contract.clientId,
    ...metrics,
  };
}

function toEntryDetails(contract: ContractWithEntries) {
  const entries: PublicContractProfitabilityReport["entries"] = [];

  for (const ticket of contract.tickets) {
    for (const entry of ticket.timeEntries) {
      const hours = toNumeric(entry.hours);
      const hourlyCost = toNumeric(entry.user.hourlyCost);

      entries.push({
        timeEntryId: entry.id,
        ticketId: ticket.id,
        userId: entry.userId,
        userName: entry.user.name,
        hours: hours.toFixed(2),
        hourlyCost: hourlyCost.toFixed(2),
        cost: calculateEntryCost(hours, hourlyCost).toFixed(2),
        workedAt: entry.workedAt.toISOString(),
      });
    }
  }

  return entries;
}

export class ProfitabilityService {
  constructor(private readonly profitability: ProfitabilityRepository = profitabilityRepository) {}

  async getSummary(filters: ProfitabilityFilters = {}): Promise<PublicProfitabilitySummary> {
    const contracts = await this.profitability.findActiveContracts(filters);
    const reports = contracts.map(toContractProfitability);
    const totals = buildProfitabilityTotals(reports);

    return {
      ...totals,
      contracts: reports,
    };
  }

  async getContractReport(
    contractId: string,
    filters: Omit<ProfitabilityFilters, "contractId"> = {},
  ): Promise<PublicContractProfitabilityReport> {
    const contracts = await this.profitability.findActiveContracts({ ...filters, contractId });
    const detailed = contracts[0];

    if (!detailed) {
      throw new NotFoundError("Contract not found");
    }

    return {
      contract: toContractProfitability(detailed),
      entries: toEntryDetails(detailed),
    };
  }
}

export const profitabilityService = new ProfitabilityService();
