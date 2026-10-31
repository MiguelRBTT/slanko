import type { Prisma, TicketEventType } from "@prisma/client";

export type PublicTicketEvent = {
  id: string;
  ticketId: string;
  type: TicketEventType;
  actorId: string;
  actorName: string;
  data: Prisma.JsonValue;
  createdAt: string;
};

export function toPublicTicketEvent(event: {
  id: string;
  ticketId: string;
  type: TicketEventType;
  actorId: string;
  actor: { name: string };
  data: Prisma.JsonValue;
  createdAt: Date;
}): PublicTicketEvent {
  return {
    id: event.id,
    ticketId: event.ticketId,
    type: event.type,
    actorId: event.actorId,
    actorName: event.actor.name,
    data: event.data,
    createdAt: event.createdAt.toISOString(),
  };
}
