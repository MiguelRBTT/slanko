import { TicketRepository, ticketRepository } from "@/repositories/ticket.repository";
import { TimeEntryRepository, timeEntryRepository } from "@/repositories/time-entry.repository";
import { BadRequestError, NotFoundError } from "@/lib/errors/app-error";
import { assertTicketAccess } from "@/lib/tickets/access";
import {
  optionalNullableString,
  parseDateTime,
  parsePositiveNumber,
} from "@/lib/validation/fields";
import type { AuthContext } from "@/types/auth";
import {
  toPublicTimeEntry,
  type CreateTimeEntryInput,
  type PublicTimeEntry,
} from "@/types/time-entry";

export class TimeEntryService {
  constructor(
    private readonly timeEntries: TimeEntryRepository = timeEntryRepository,
    private readonly tickets: TicketRepository = ticketRepository,
  ) {}

  async listTimeEntries(ticketId: string, auth: AuthContext): Promise<PublicTimeEntry[]> {
    const ticket = await this.tickets.findById(ticketId);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    assertTicketAccess(ticket, auth);

    const rows = await this.timeEntries.findByTicketId(ticketId);
    return rows.map(toPublicTimeEntry);
  }

  async createTimeEntry(
    ticketId: string,
    input: CreateTimeEntryInput,
    auth: AuthContext,
  ): Promise<PublicTimeEntry> {
    const ticket = await this.tickets.findById(ticketId);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    assertTicketAccess(ticket, auth);

    if (ticket.status === "CLOSED") {
      throw new BadRequestError("Cannot log hours on a closed ticket");
    }

    const entry = await this.timeEntries.create({
      ticket: { connect: { id: ticketId } },
      user: { connect: { id: auth.userId } },
      hours: parsePositiveNumber(input.hours, "hours"),
      note: optionalNullableString(input.note) ?? null,
      workedAt: parseDateTime(input.workedAt, "workedAt"),
    });

    return toPublicTimeEntry(entry);
  }
}

export const timeEntryService = new TimeEntryService();
