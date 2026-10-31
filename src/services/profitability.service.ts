import {
  buildProfitabilityTotals,
  calculateContractProfitability,
  calculateEntryCost,
  calculateProratedRevenue,
  resolveRevenueWindow,
  toNumeric,
} from "@/lib/profitability/calculations";
import { NotFoundError } from "@/lib/errors/app-error";
import { REPORTABLE_CONTRACT_STATUSES } from "@/lib/reports/contract-status-filter";
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

type ContractWithEntries = Awaited<ReturnType<ProfitabilityRepository["findContracts"]>>[number];

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toContractProfitability(
  contract: ContractWithEntries,
  filters: ProfitabilityFilters,
  today: Date,
): PublicContractProfitability {
  let totalHours = 0;
  let totalCost = 0;

  for (const ticket of contract.tickets) {
    for (const entry of ticket.timeEntries) {
      const hours = toNumeric(entry.hours);
      // Custo/hora gravado no apontamento: alterar o custo do colaborador não reescreve o passado.
      const hourlyCost = toNumeric(entry.hourlyCost);
      totalHours += hours;
      totalCost += calculateEntryCost(hours, hourlyCost);
    }
  }

  const monthlyValue = toNumeric(contract.value);
  const window = resolveRevenueWindow({
    contractStart: contract.startDate,
    contractEnd: contract.endDate,
    periodStart: filters.workedFrom,
    periodEnd: filters.workedTo,
    today,
  });

  const metrics = calculateContractProfitability({
    contractValue: monthlyValue,
    revenue: calculateProratedRevenue(monthlyValue, window),
    totalHours,
    totalCost,
  });

  return {
    contractId: contract.id,
    contractCode: contract.code,
    contractTitle: contract.title,
    clientId: contract.clientId,
    contractStatus: contract.status,
    periodStart: window ? toDateOnly(window.start) : null,
    periodEnd: window ? toDateOnly(window.end) : null,
    ...metrics,
  };
}

function toEntryDetails(contract: ContractWithEntries) {
  const entries: PublicContractProfitabilityReport["entries"] = [];

  for (const ticket of contract.tickets) {
    for (const entry of ticket.timeEntries) {
      const hours = toNumeric(entry.hours);
      const hourlyCost = toNumeric(entry.hourlyCost);

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
  constructor(
    private readonly profitability: ProfitabilityRepository = profitabilityRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getSummary(filters: ProfitabilityFilters = {}): Promise<PublicProfitabilitySummary> {
    const contracts = await this.profitability.findContracts(filters);
    const today = this.clock();
    const reports = contracts.map((contract) => toContractProfitability(contract, filters, today));
    const totals = buildProfitabilityTotals(reports);

    return {
      ...totals,
      contracts: reports,
    };
  }

  async getContractReport(
    contractId: string,
    filters: Omit<ProfitabilityFilters, "contractId" | "contractStatuses"> = {},
  ): Promise<PublicContractProfitabilityReport> {
    const contracts = await this.profitability.findContracts({
      ...filters,
      contractId,
      contractStatuses: REPORTABLE_CONTRACT_STATUSES,
    });
    const detailed = contracts[0];

    if (!detailed) {
      throw new NotFoundError("Contract not found");
    }

    return {
      contract: toContractProfitability(detailed, filters, this.clock()),
      entries: toEntryDetails(detailed),
    };
  }
}

export const profitabilityService = new ProfitabilityService();
