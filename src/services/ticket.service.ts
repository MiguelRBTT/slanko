import type { Ticket, TicketPriority, TicketStatus } from "@prisma/client";
import { ContractRepository, contractRepository } from "@/repositories/contract.repository";
import { TicketRepository, ticketRepository } from "@/repositories/ticket.repository";
import { UserRepository, userRepository } from "@/repositories/user.repository";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/app-error";
import {
  optionalNullableString,
  requireNonEmptyString,
} from "@/lib/validation/fields";
import type { AuthContext } from "@/types/auth";
import {
  toPublicTicket,
  type CreateTicketInput,
  type PublicTicket,
  type TicketListFilters,
  type UpdateTicketInput,
} from "@/types/ticket";

const TICKET_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];
const RESPONSE_STATUSES: TicketStatus[] = ["IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];

function parseTicketPriority(value: unknown, field = "priority"): TicketPriority {
  if (typeof value !== "string" || !TICKET_PRIORITIES.includes(value as TicketPriority)) {
    throw new BadRequestError(`${field} is invalid`);
  }

  return value as TicketPriority;
}

function parseTicketStatus(value: unknown, field = "status"): TicketStatus {
  if (typeof value !== "string" || !TICKET_STATUSES.includes(value as TicketStatus)) {
    throw new BadRequestError(`${field} is invalid`);
  }

  return value as TicketStatus;
}

function assertTicketMutable(ticket: Ticket): void {
  if (ticket.status === "CLOSED") {
    throw new BadRequestError("Closed tickets cannot be updated");
  }
}

function applySlaTimestamps(
  existing: Ticket,
  nextStatus: TicketStatus,
  assignedToId: string | null,
  now: Date,
): {
  firstResponseAt?: Date;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
} {
  const timestamps: {
    firstResponseAt?: Date;
    resolvedAt?: Date | null;
    closedAt?: Date | null;
  } = {};

  if (
    !existing.firstResponseAt &&
    (RESPONSE_STATUSES.includes(nextStatus) || assignedToId !== existing.assignedToId)
  ) {
    if (RESPONSE_STATUSES.includes(nextStatus) || assignedToId) {
      timestamps.firstResponseAt = now;
    }
  }

  if (nextStatus === "RESOLVED" && existing.status !== "RESOLVED") {
    timestamps.resolvedAt = now;
  }

  if (nextStatus === "CLOSED" && existing.status !== "CLOSED") {
    timestamps.closedAt = now;
  }

  if (nextStatus !== "RESOLVED" && nextStatus !== "CLOSED" && existing.resolvedAt) {
    timestamps.resolvedAt = null;
  }

  if (nextStatus !== "CLOSED" && existing.closedAt) {
    timestamps.closedAt = null;
  }

  return timestamps;
}

export class TicketService {
  constructor(
    private readonly tickets: TicketRepository = ticketRepository,
    private readonly contracts: ContractRepository = contractRepository,
    private readonly users: UserRepository = userRepository,
  ) {}

  async listTickets(auth: AuthContext, filters: TicketListFilters = {}): Promise<PublicTicket[]> {
    const rows =
      auth.role === "GESTOR"
        ? await this.tickets.findMany(filters)
        : await this.tickets.findMany({
            ...filters,
            accessibleByUserId: auth.userId,
          });

    return rows.map(toPublicTicket);
  }

  async getTicketById(id: string, auth: AuthContext): Promise<PublicTicket> {
    const ticket = await this.tickets.findById(id);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    this.assertTicketAccess(ticket, auth);

    return toPublicTicket(ticket);
  }

  async createTicket(input: CreateTicketInput, auth: AuthContext): Promise<PublicTicket> {
    const contractId = requireNonEmptyString(input.contractId, "contractId");
    await this.ensureActiveContract(contractId);

    if (input.assignedToId !== undefined && auth.role !== "GESTOR") {
      throw new ForbiddenError("Only gestor can assign tickets");
    }

    if (input.assignedToId) {
      await this.ensureActiveAssignee(input.assignedToId);
    }

    const now = new Date();
    const assignedToId = input.assignedToId ?? null;

    const ticket = await this.tickets.create({
      contract: { connect: { id: contractId } },
      openedBy: { connect: { id: auth.userId } },
      ...(assignedToId ? { assignedTo: { connect: { id: assignedToId } } } : {}),
      title: requireNonEmptyString(input.title, "title"),
      description: requireNonEmptyString(input.description, "description"),
      priority: parseTicketPriority(input.priority),
      category: requireNonEmptyString(input.category, "category"),
      status: "OPEN",
      openedAt: now,
      ...(assignedToId ? { firstResponseAt: now } : {}),
    });

    return toPublicTicket(ticket);
  }

  async updateTicket(
    id: string,
    input: UpdateTicketInput,
    auth: AuthContext,
  ): Promise<PublicTicket> {
    const existing = await this.tickets.findById(id);

    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    this.assertTicketAccess(existing, auth);
    assertTicketMutable(existing);

    if (input.assignedToId !== undefined && auth.role !== "GESTOR") {
      throw new ForbiddenError("Only gestor can assign tickets");
    }

    const nextStatus = input.status !== undefined ? parseTicketStatus(input.status) : existing.status;
    const nextAssignedToId =
      input.assignedToId !== undefined ? input.assignedToId : existing.assignedToId;

    if (input.assignedToId) {
      await this.ensureActiveAssignee(input.assignedToId);
    }

    const solution =
      input.solution !== undefined
        ? (optionalNullableString(input.solution) as string | null)
        : existing.solution;

    if ((nextStatus === "RESOLVED" || nextStatus === "CLOSED") && !solution) {
      throw new BadRequestError("solution is required to resolve or close a ticket");
    }

    const now = new Date();
    const slaTimestamps = applySlaTimestamps(existing, nextStatus, nextAssignedToId, now);

    const ticket = await this.tickets.update(id, {
      ...(input.title !== undefined ? { title: requireNonEmptyString(input.title, "title") } : {}),
      ...(input.description !== undefined
        ? { description: requireNonEmptyString(input.description, "description") }
        : {}),
      ...(input.priority !== undefined ? { priority: parseTicketPriority(input.priority) } : {}),
      ...(input.category !== undefined
        ? { category: requireNonEmptyString(input.category, "category") }
        : {}),
      ...(input.status !== undefined ? { status: nextStatus } : {}),
      ...(input.assignedToId !== undefined
        ? nextAssignedToId
          ? { assignedTo: { connect: { id: nextAssignedToId } } }
          : { assignedTo: { disconnect: true } }
        : {}),
      ...(input.solution !== undefined ? { solution } : {}),
      ...slaTimestamps,
    });

    return toPublicTicket(ticket);
  }

  private assertTicketAccess(ticket: Ticket, auth: AuthContext): void {
    if (auth.role === "GESTOR") {
      return;
    }

    if (ticket.assignedToId === auth.userId || ticket.openedById === auth.userId) {
      return;
    }

    throw new ForbiddenError("Insufficient permissions");
  }

  private async ensureActiveContract(contractId: string): Promise<void> {
    const contract = await this.contracts.findById(contractId);

    if (!contract || contract.status !== "ACTIVE") {
      throw new BadRequestError("Contract not found or not active");
    }
  }

  private async ensureActiveAssignee(userId: string): Promise<void> {
    const user = await this.users.findById(userId);

    if (!user || !user.active) {
      throw new BadRequestError("Assignee not found or inactive");
    }
  }
}

export const ticketService = new TicketService();
