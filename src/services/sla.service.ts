import { buildSlaCounters, evaluateResolutionSla, evaluateResponseSla } from "@/lib/sla/calculations";
import { NotFoundError } from "@/lib/errors/app-error";
import { SlaRepository, slaRepository, type SlaTicketFilters } from "@/repositories/sla.repository";
import type {
  PublicContractSlaReport,
  PublicSlaSummary,
  PublicTicketSlaEvaluation,
} from "@/types/sla";

type TicketWithContract = Awaited<ReturnType<SlaRepository["findTickets"]>>[number];

function toTicketEvaluation(ticket: TicketWithContract): PublicTicketSlaEvaluation {
  return {
    ticketId: ticket.id,
    contractId: ticket.contractId,
    title: ticket.title,
    status: ticket.status,
    openedAt: ticket.openedAt.toISOString(),
    response: evaluateResponseSla({
      openedAt: ticket.openedAt,
      firstResponseAt: ticket.firstResponseAt,
      targetMinutes: ticket.contract.responseMinutes,
    }),
    resolution: evaluateResolutionSla({
      openedAt: ticket.openedAt,
      resolvedAt: ticket.resolvedAt,
      targetMinutes: ticket.contract.resolutionMinutes,
    }),
  };
}

export class SlaService {
  constructor(private readonly sla: SlaRepository = slaRepository) {}

  async getSummary(filters: SlaTicketFilters = {}): Promise<PublicSlaSummary> {
    const tickets = await this.sla.findTickets(filters);
    const evaluations = tickets.map(toTicketEvaluation);
    const counters = buildSlaCounters(evaluations);

    return {
      ...counters,
      tickets: evaluations,
    };
  }

  async getContractReport(contractId: string, filters: Omit<SlaTicketFilters, "contractId"> = {}): Promise<PublicContractSlaReport> {
    const contract = await this.sla.findActiveContract(contractId);

    if (!contract) {
      throw new NotFoundError("Contract not found");
    }

    const tickets = await this.sla.findTickets({ ...filters, contractId });
    const evaluations = tickets.map(toTicketEvaluation);
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
