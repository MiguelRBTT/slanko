import type { Prisma, TicketEventType, TicketPriority, TicketStatus } from "@prisma/client";

export type TicketEventDraft = {
  type: TicketEventType;
  data: Prisma.InputJsonObject;
};

export type TicketSnapshot = {
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
  status: TicketStatus;
  solution: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  observerIds: string[];
};

const AUDITED_FIELDS = ["title", "description", "priority", "category", "solution"] as const;

/** Mesmo conjunto de ids, sem depender da ordem (os ids de observadores não se repetem). */
function sameIds(a: string[], b: string[]): boolean {
  const ids = new Set(b);
  return a.length === b.length && a.every((id) => ids.has(id));
}

function assigneeRef(id: string | null, name: string | null) {
  return id ? { id, name } : null;
}

export function buildCreatedEvent(
  snapshot: TicketSnapshot,
  slaTargets?: { responseMinutes: number; resolutionMinutes: number },
): TicketEventDraft {
  return {
    type: "CREATED",
    data: {
      status: snapshot.status,
      priority: snapshot.priority,
      assignedTo: assigneeRef(snapshot.assignedToId, snapshot.assignedToName),
      observerIds: snapshot.observerIds,
      ...(slaTargets ?? {}),
    },
  };
}

/** Compara o chamado antes/depois de uma alteração e gera os eventos do histórico. */
export function buildUpdateEvents(before: TicketSnapshot, after: TicketSnapshot): TicketEventDraft[] {
  const events: TicketEventDraft[] = [];

  if (before.status !== after.status) {
    events.push({ type: "STATUS_CHANGED", data: { from: before.status, to: after.status } });
  }

  if (before.assignedToId !== after.assignedToId) {
    events.push({
      type: "ASSIGNEE_CHANGED",
      data: {
        from: assigneeRef(before.assignedToId, before.assignedToName),
        to: assigneeRef(after.assignedToId, after.assignedToName),
      },
    });
  }

  if (!sameIds(before.observerIds, after.observerIds)) {
    events.push({
      type: "OBSERVERS_CHANGED",
      data: {
        added: after.observerIds.filter((id) => !before.observerIds.includes(id)),
        removed: before.observerIds.filter((id) => !after.observerIds.includes(id)),
      },
    });
  }

  const fields: Prisma.InputJsonObject = Object.fromEntries(
    AUDITED_FIELDS.filter((field) => before[field] !== after[field]).map((field) => [
      field,
      { from: before[field], to: after[field] },
    ]),
  );

  if (Object.keys(fields).length > 0) {
    events.push({ type: "UPDATED", data: { fields } });
  }

  return events;
}
