export type PublicTimeEntry = {
  id: string;
  ticketId: string;
  userId: string;
  hours: string;
  note: string | null;
  workedAt: string;
};

export type CreateTimeEntryInput = {
  hours: number | string;
  note?: string | null;
  workedAt: string;
};

export function toPublicTimeEntry(entry: {
  id: string;
  ticketId: string;
  userId: string;
  hours: { toString(): string };
  note: string | null;
  workedAt: Date;
}): PublicTimeEntry {
  return {
    id: entry.id,
    ticketId: entry.ticketId,
    userId: entry.userId,
    hours: entry.hours.toString(),
    note: entry.note,
    workedAt: entry.workedAt.toISOString(),
  };
}
