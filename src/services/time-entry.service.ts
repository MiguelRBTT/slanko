import { TicketRepository, ticketRepository } from "@/repositories/ticket.repository";
import { TimeEntryRepository, timeEntryRepository } from "@/repositories/time-entry.repository";
import { UserRepository, userRepository } from "@/repositories/user.repository";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors/app-error";
import { toNumeric } from "@/lib/profitability/calculations";
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
  type UpdateTimeEntryInput,
} from "@/types/time-entry";

const MS_PER_DAY = 86_400_000;
export const MAX_HOURS_PER_ENTRY = 24;

function parseHours(value: unknown): number {
  const hours = parsePositiveNumber(value, "hours");

  if (hours > MAX_HOURS_PER_ENTRY) {
    throw new BadRequestError(`hours cannot exceed ${MAX_HOURS_PER_ENTRY} per entry`);
  }

  return hours;
}

/**
 * Data do trabalho entre o dia de abertura do chamado e hoje.
 * A tolerância de 1 dia cobre o fuso horário (a interface envia meio-dia do horário local).
 */
function parseWorkedAt(value: unknown, openedAt: Date, now: Date): Date {
  const workedAt = parseDateTime(value, "workedAt");
  const openedDayStart = Date.UTC(openedAt.getUTCFullYear(), openedAt.getUTCMonth(), openedAt.getUTCDate());

  if (workedAt.getTime() > now.getTime() + MS_PER_DAY) {
    throw new BadRequestError("workedAt cannot be in the future");
  }

  if (workedAt.getTime() < openedDayStart - MS_PER_DAY) {
    throw new BadRequestError("workedAt cannot be before the ticket was opened");
  }

  return workedAt;
}

export class TimeEntryService {
  constructor(
    private readonly timeEntries: TimeEntryRepository = timeEntryRepository,
    private readonly tickets: TicketRepository = ticketRepository,
    private readonly users: UserRepository = userRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async listTimeEntries(ticketId: string, auth: AuthContext): Promise<PublicTimeEntry[]> {
    await this.requireAccessibleTicket(ticketId, auth);

    const rows = await this.timeEntries.findByTicketId(ticketId);
    return rows.map(toPublicTimeEntry);
  }

  async createTimeEntry(
    ticketId: string,
    input: CreateTimeEntryInput,
    auth: AuthContext,
  ): Promise<PublicTimeEntry> {
    const ticket = await this.requireOpenTicket(ticketId, auth);
    const user = await this.users.findById(auth.userId);

    if (!user || !user.active) {
      throw new UnauthorizedError("User not found or inactive");
    }

    const entry = await this.timeEntries.create({
      ticketId,
      userId: auth.userId,
      hours: parseHours(input.hours),
      // Snapshot do custo/hora atual: mudanças futuras no cadastro não alteram este apontamento.
      hourlyCost: toNumeric(user.hourlyCost),
      note: optionalNullableString(input.note) ?? null,
      workedAt: parseWorkedAt(input.workedAt, ticket.openedAt, this.clock()),
    });

    return toPublicTimeEntry(entry);
  }

  async updateTimeEntry(
    ticketId: string,
    entryId: string,
    input: UpdateTimeEntryInput,
    auth: AuthContext,
  ): Promise<PublicTimeEntry> {
    const ticket = await this.requireOpenTicket(ticketId, auth);
    await this.requireOwnEntry(ticketId, entryId, auth);

    const entry = await this.timeEntries.update(
      entryId,
      {
        ...(input.hours !== undefined ? { hours: parseHours(input.hours) } : {}),
        ...(input.workedAt !== undefined
          ? { workedAt: parseWorkedAt(input.workedAt, ticket.openedAt, this.clock()) }
          : {}),
        ...(input.note !== undefined ? { note: optionalNullableString(input.note) ?? null } : {}),
      },
      auth.userId,
    );

    return toPublicTimeEntry(entry);
  }

  async deleteTimeEntry(ticketId: string, entryId: string, auth: AuthContext): Promise<void> {
    await this.requireOpenTicket(ticketId, auth);
    await this.requireOwnEntry(ticketId, entryId, auth);
    await this.timeEntries.delete(entryId, auth.userId);
  }

  private async requireAccessibleTicket(ticketId: string, auth: AuthContext) {
    const ticket = await this.tickets.findById(ticketId);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    assertTicketAccess(ticket, auth);
    return ticket;
  }

  private async requireOpenTicket(ticketId: string, auth: AuthContext) {
    const ticket = await this.requireAccessibleTicket(ticketId, auth);

    if (ticket.status === "CLOSED") {
      throw new BadRequestError("Closed tickets cannot have their time changed");
    }

    return ticket;
  }

  /** Só quem apontou (ou o gestor) corrige um apontamento. */
  private async requireOwnEntry(ticketId: string, entryId: string, auth: AuthContext) {
    const entry = await this.timeEntries.findById(entryId);

    if (!entry || entry.ticketId !== ticketId) {
      throw new NotFoundError("Time entry not found");
    }

    if (auth.role !== "GESTOR" && entry.userId !== auth.userId) {
      throw new ForbiddenError("Only the author or the gestor can change this time entry");
    }

    return entry;
  }
}

export const timeEntryService = new TimeEntryService();
