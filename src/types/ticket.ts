import type { TicketPriority, TicketStatus } from "@prisma/client";

export type PublicTicket = {
  id: string;
  contractId: string;
  openedById: string;
  assignedToId: string | null;
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  status: TicketStatus;
  openedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  solution: string | null;
};

export type CreateTicketInput = {
  contractId: string;
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  assignedToId?: string | null;
};

export type UpdateTicketInput = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
  status?: TicketStatus;
  assignedToId?: string | null;
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
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  status: TicketStatus;
  openedAt: Date;
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
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    category: ticket.category,
    status: ticket.status,
    openedAt: ticket.openedAt.toISOString(),
    firstResponseAt: toIsoDateTime(ticket.firstResponseAt),
    resolvedAt: toIsoDateTime(ticket.resolvedAt),
    closedAt: toIsoDateTime(ticket.closedAt),
    solution: ticket.solution,
  };
}
