import type { TicketPriority, TicketStatus } from "@prisma/client";

export type PublicTicket = {
  id: string;
  contractId: string;
  openedById: string;
  assignedToId: string | null;
  assignedToName: string | null;
  observerIds: string[];
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  status: TicketStatus;
  openedAt: string;
  /** Metas de SLA (minutos) congeladas na abertura do chamado. */
  responseMinutes: number;
  resolutionMinutes: number;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  solution: string | null;
  /** Total de horas apontadas (só na listagem). */
  loggedHours?: string;
};

export type CreateTicketInput = {
  contractId: string;
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  assignedToId?: string | null;
  observerIds?: string[];
};

export type UpdateTicketInput = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
  status?: TicketStatus;
  assignedToId?: string | null;
  observerIds?: string[];
  solution?: string | null;
};

export type TicketListFilters = {
  contractId?: string;
  status?: TicketStatus;
  assignedToId?: string;
  priority?: TicketPriority;
};

function toIsoDateTime(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toPublicTicket(ticket: {
  id: string;
  contractId: string;
  openedById: string;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string } | null;
  observers?: Array<{ userId: string }>;
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  status: TicketStatus;
  openedAt: Date;
  responseMinutes: number;
  resolutionMinutes: number;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  solution: string | null;
}): PublicTicket {
  return {
    id: ticket.id,
    contractId: ticket.contractId,
    openedById: ticket.openedById,
    assignedToId: ticket.assignedToId,
    assignedToName: ticket.assignedTo?.name ?? null,
    observerIds: (ticket.observers ?? []).map((observer) => observer.userId),
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    category: ticket.category,
    status: ticket.status,
    openedAt: ticket.openedAt.toISOString(),
    responseMinutes: ticket.responseMinutes,
    resolutionMinutes: ticket.resolutionMinutes,
    firstResponseAt: toIsoDateTime(ticket.firstResponseAt),
    resolvedAt: toIsoDateTime(ticket.resolvedAt),
    closedAt: toIsoDateTime(ticket.closedAt),
    solution: ticket.solution,
  };
}
