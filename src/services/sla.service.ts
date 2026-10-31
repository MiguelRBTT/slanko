import { slaAlertReasons } from "@/lib/sla/alerts";
import { buildSlaCounters, evaluateResolutionSla, evaluateResponseSla } from "@/lib/sla/calculations";
import { NotFoundError } from "@/lib/errors/app-error";
import { REPORTABLE_CONTRACT_STATUSES } from "@/lib/reports/contract-status-filter";
import { SlaRepository, slaRepository, type SlaTicketFilters } from "@/repositories/sla.repository";
import type {
  PublicContractSlaAlert,
  PublicContractSlaReport,
  PublicSlaSummary,
  PublicTicketSlaEvaluation,
} from "@/types/sla";

type TicketWithContract = Awaited<ReturnType<SlaRepository["findTickets"]>>[number];

function toTicketEvaluation(ticket: TicketWithContract, now: Date): PublicTicketSlaEvaluation {
  return {
    ticketId: ticket.id,
    contractId: ticket.contractId,
    title: ticket.title,
    status: ticket.status,
    openedAt: ticket.openedAt.toISOString(),
    response: evaluateResponseSla({
      openedAt: ticket.openedAt,
      firstResponseAt: ticket.firstResponseAt,
      // Metas congeladas no chamado (não as atuais do contrato).
      targetMinutes: ticket.responseMinutes,
      now,
    }),
    resolution: evaluateResolutionSla({
      openedAt: ticket.openedAt,
      // Chamado encerrado sem passar por "resolvido" conta como resolvido no encerramento.
      resolvedAt: ticket.resolvedAt ?? ticket.closedAt,
      targetMinutes: ticket.resolutionMinutes,
      now,
    }),
  };
}

/** Agrupa as avaliações por contrato e aplica a regra de alerta do RF13. */
function toContractAlerts(
  tickets: TicketWithContract[],
  evaluations: PublicTicketSlaEvaluation[],
): PublicContractSlaAlert[] {
  const groups = new Map<string, { contract: TicketWithContract["contract"]; items: PublicTicketSlaEvaluation[] }>();

  tickets.forEach((ticket, index) => {
    const group = groups.get(ticket.contractId) ?? { contract: ticket.contract, items: [] };
    group.items.push(evaluations[index]);
    groups.set(ticket.contractId, group);
  });

  return [...groups.values()].map(({ contract, items }) => {
    const counters = buildSlaCounters(items);
    const breachedTickets = items.filter(
      (item) => item.response.status === "BREACHED" || item.resolution.status === "BREACHED",
    ).length;
    const alertReasons = slaAlertReasons({
      responseComplianceRate: counters.response.complianceRate,
      resolutionComplianceRate: counters.resolution.complianceRate,
      breachedTickets,
    });

    return {
      contractId: contract.id,
      contractCode: contract.code,
      contractTitle: contract.title,
      totalTickets: counters.totalTickets,
      breachedTickets,
      responseComplianceRate: counters.response.complianceRate,
      resolutionComplianceRate: counters.resolution.complianceRate,
      alert: alertReasons.length > 0,
      alertReasons,
    };
  });
}

export class SlaService {
  constructor(
    private readonly sla: SlaRepository = slaRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getSummary(filters: SlaTicketFilters = {}): Promise<PublicSlaSummary> {
    const tickets = await this.sla.findTickets(filters);
    const now = this.clock();
    const evaluations = tickets.map((ticket) => toTicketEvaluation(ticket, now));
    const counters = buildSlaCounters(evaluations);

    return {
      ...counters,
      tickets: evaluations,
      contracts: toContractAlerts(tickets, evaluations),
    };
  }

  async getContractReport(
    contractId: string,
    filters: Omit<SlaTicketFilters, "contractId" | "contractStatuses"> = {},
  ): Promise<PublicContractSlaReport> {
    const contract = await this.sla.findReportableContract(contractId);

    if (!contract) {
      throw new NotFoundError("Contract not found");
    }

    const tickets = await this.sla.findTickets({
      ...filters,
      contractId,
      contractStatuses: REPORTABLE_CONTRACT_STATUSES,
    });
    const now = this.clock();
    const evaluations = tickets.map((ticket) => toTicketEvaluation(ticket, now));
    const counters = buildSlaCounters(evaluations);

    return {
      contractId: contract.id,
      contractCode: contract.code,
      contractTitle: contract.title,
      clientId: contract.clientId,
      responseMinutes: contract.responseMinutes,
      resolutionMinutes: contract.resolutionMinutes,
      summary: counters,
      tickets: evaluations,
    };
  }
}

export const slaService = new SlaService();
