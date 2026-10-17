import { ForbiddenError } from "@/lib/errors/app-error";
import type { AuthContext } from "@/types/auth";

export type TicketAccessFields = {
  assignedToId: string | null;
  openedById: string;
  observers?: Array<{ userId: string }>;
};

export function canAccessTicket(ticket: TicketAccessFields, auth: AuthContext): boolean {
  if (auth.role === "GESTOR") {
    return true;
  }

  if (ticket.assignedToId === auth.userId) {
    return true;
  }

  if (ticket.openedById === auth.userId && ticket.assignedToId === null) {
    return true;
  }

  if (ticket.observers?.some((observer) => observer.userId === auth.userId)) {
    return true;
  }

  return false;
}

export function assertTicketAccess(ticket: TicketAccessFields, auth: AuthContext): void {
  if (!canAccessTicket(ticket, auth)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}
