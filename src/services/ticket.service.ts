import type { Ticket, TicketPriority, TicketStatus } from "@prisma/client";
import { ContractRepository, contractRepository } from "@/repositories/contract.repository";
import {
  TicketEventRepository,
  ticketEventRepository,
} from "@/repositories/ticket-event.repository";
import { TicketRepository, ticketRepository } from "@/repositories/ticket.repository";
import { UserRepository, userRepository } from "@/repositories/user.repository";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/app-error";
import { assertTicketAccess } from "@/lib/tickets/access";
import {
  buildCreatedEvent,
  buildUpdateEvents,
  type TicketEventDraft,
  type TicketSnapshot,
} from "@/lib/tickets/events";
import {
  optionalNullableString,
  requireNonEmptyString,
} from "@/lib/validation/fields";
import type { AuthContext } from "@/types/auth";
import { toPublicTicketEvent, type PublicTicketEvent } from "@/types/ticket-event";
import {
  toPublicTicket,
  type CreateTicketInput,
  type PublicTicket,
  type TicketListFilters,
  type UpdateTicketInput,
} from "@/types/ticket";
import {
  TicketAttachmentService,
  ticketAttachmentService,
} from "@/services/ticket-attachment.service";

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

/**
 * Marcos de SLA. O relógio começa na abertura (openedAt) e a 1ª resposta é o início
 * do atendimento: sair de "Aberto" para outra situação ou o 1º apontamento de tempo
 * (ver TimeEntryRepository). Atribuir responsável sozinho não conta como resposta.
 */
function applySlaTimestamps(
  existing: Ticket,
  nextStatus: TicketStatus,
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

  if (!existing.firstResponseAt && RESPONSE_STATUSES.includes(nextStatus)) {
    timestamps.firstResponseAt = now;
  }

  if (nextStatus === "RESOLVED" && existing.status !== "RESOLVED") {
    timestamps.resolvedAt = now;
  }

  if (nextStatus === "CLOSED" && existing.status !== "CLOSED") {
    timestamps.closedAt = now;

    // Encerrar direto (sem passar por "Resolvido") também conclui a resolução.
    if (!existing.resolvedAt) {
      timestamps.resolvedAt = now;
    }
  }

  if (nextStatus !== "RESOLVED" && nextStatus !== "CLOSED" && existing.resolvedAt) {
    timestamps.resolvedAt = null;
  }

  if (nextStatus !== "CLOSED" && existing.closedAt) {
    timestamps.closedAt = null;
  }

  return timestamps;
}

/**
 * Eventos do histórico como escrita aninhada `createMany`: um único INSERT na ordem do array,
 * então a sequência (auto incremento) reflete a ordem das mudanças.
 */
function eventWrites(drafts: TicketEventDraft[], actorId: string) {
  return {
    createMany: {
      data: drafts.map((draft) => ({ type: draft.type, data: draft.data, actorId })),
    },
  };
}

function sameIdSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

function parseAssigneeId(value: unknown): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    throw new BadRequestError("assignedToId is invalid");
  }

  return value.trim() || null;
}

function parseObserverIds(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError("observerIds must be an array");
  }

  const ids = value.map((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new BadRequestError(`observerIds[${index}] is invalid`);
    }
    return item.trim();
  });

  return [...new Set(ids)];
}

export class TicketService {
  constructor(
    private readonly tickets: TicketRepository = ticketRepository,
    private readonly contracts: ContractRepository = contractRepository,
    private readonly users: UserRepository = userRepository,
    private readonly attachments: TicketAttachmentService = ticketAttachmentService,
    private readonly events: TicketEventRepository = ticketEventRepository,
  ) {}

  async listTickets(auth: AuthContext, filters: TicketListFilters = {}): Promise<PublicTicket[]> {
    const rows =
      auth.role === "GESTOR"
        ? await this.tickets.findMany(filters)
        : await this.tickets.findMany({
            ...filters,
            accessibleByUserId: auth.userId,
          });

    const loggedHours = await this.tickets.sumLoggedHours(rows.map((row) => row.id));

    return rows.map((row) => ({ ...toPublicTicket(row), loggedHours: loggedHours.get(row.id) ?? "0" }));
  }

  async getTicketById(id: string, auth: AuthContext): Promise<PublicTicket> {
    const ticket = await this.tickets.findById(id);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    assertTicketAccess(ticket, auth);

    return toPublicTicket(ticket);
  }

  async createTicket(input: CreateTicketInput, auth: AuthContext): Promise<PublicTicket> {
    const contractId = requireNonEmptyString(input.contractId, "contractId");
    const contract = await this.ensureActiveContract(contractId);

    const assignedToId = parseAssigneeId(input.assignedToId) ?? null;
    const requestedObserverIds = parseObserverIds(input.observerIds) ?? [];

    // UC06: só o gestor atribui a terceiros e define observadores; o técnico pode assumir.
    if (auth.role !== "GESTOR") {
      if (assignedToId && assignedToId !== auth.userId) {
        throw new ForbiddenError("Only the gestor can assign tickets to other people");
      }

      if (requestedObserverIds.length > 0) {
        throw new ForbiddenError("Only the gestor can set observers");
      }
    }

    const assignee = assignedToId ? await this.ensureActiveAssignee(assignedToId) : null;

    const observerIds = await this.normalizeObserverIds(requestedObserverIds, assignedToId);

    const now = new Date();
    const snapshot: TicketSnapshot = {
      title: requireNonEmptyString(input.title, "title"),
      description: requireNonEmptyString(input.description, "description"),
      priority: parseTicketPriority(input.priority),
      category: requireNonEmptyString(input.category, "category"),
      status: "OPEN",
      solution: null,
      assignedToId,
      assignedToName: assignee?.name ?? null,
      observerIds,
    };

    const ticket = await this.tickets.create({
      contract: { connect: { id: contractId } },
      openedBy: { connect: { id: auth.userId } },
      ...(assignedToId ? { assignedTo: { connect: { id: assignedToId } } } : {}),
      title: snapshot.title,
      description: snapshot.description,
      priority: snapshot.priority,
      category: snapshot.category,
      status: "OPEN",
      openedAt: now,
      // Metas congeladas: alterar o contrato depois não muda o SLA deste chamado.
      responseMinutes: contract.responseMinutes,
      resolutionMinutes: contract.resolutionMinutes,
      events: eventWrites(
        [
          buildCreatedEvent(snapshot, {
            responseMinutes: contract.responseMinutes,
            resolutionMinutes: contract.resolutionMinutes,
          }),
        ],
        auth.userId,
      ),
      ...(observerIds.length > 0
        ? {
            observers: {
              create: observerIds.map((userId) => ({
                user: { connect: { id: userId } },
              })),
            },
          }
        : {}),
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

    assertTicketAccess(existing, auth);
    assertTicketMutable(existing);

    const nextStatus = input.status !== undefined ? parseTicketStatus(input.status) : existing.status;
    const assigneeInput = parseAssigneeId(input.assignedToId);
    const nextAssignedToId = assigneeInput !== undefined ? assigneeInput : existing.assignedToId;

    // UC06: o técnico só pode assumir para si um chamado ainda sem responsável.
    if (auth.role !== "GESTOR" && assigneeInput !== undefined && assigneeInput !== existing.assignedToId) {
      const claimingUnassigned = existing.assignedToId === null && assigneeInput === auth.userId;

      if (!claimingUnassigned) {
        throw new ForbiddenError("Only the gestor can assign or reassign tickets");
      }
    }
    const assignee =
      assigneeInput && assigneeInput !== existing.assignedToId
        ? await this.ensureActiveAssignee(assigneeInput)
        : null;

    const solution =
      input.solution !== undefined
        ? (optionalNullableString(input.solution) as string | null)
        : existing.solution;

    if ((nextStatus === "RESOLVED" || nextStatus === "CLOSED") && !solution) {
      throw new BadRequestError("solution is required to resolve or close a ticket");
    }

    const existingObserverIds = existing.observers.map((observer) => observer.userId);
    const requestedObserverIds = parseObserverIds(input.observerIds);

    if (
      auth.role !== "GESTOR" &&
      requestedObserverIds !== undefined &&
      !sameIdSet(requestedObserverIds, existingObserverIds)
    ) {
      throw new ForbiddenError("Only the gestor can change observers");
    }

    const nextObserverIds =
      input.observerIds !== undefined
        ? await this.normalizeObserverIds(requestedObserverIds ?? [], nextAssignedToId)
        : existingObserverIds.filter((userId) => userId !== nextAssignedToId);

    const before: TicketSnapshot = {
      title: existing.title,
      description: existing.description,
      priority: existing.priority,
      category: existing.category,
      status: existing.status,
      solution: existing.solution,
      assignedToId: existing.assignedToId,
      assignedToName: existing.assignedTo?.name ?? null,
      observerIds: existingObserverIds,
    };

    const after: TicketSnapshot = {
      title: input.title !== undefined ? requireNonEmptyString(input.title, "title") : existing.title,
      description:
        input.description !== undefined
          ? requireNonEmptyString(input.description, "description")
          : existing.description,
      priority: input.priority !== undefined ? parseTicketPriority(input.priority) : existing.priority,
      category:
        input.category !== undefined ? requireNonEmptyString(input.category, "category") : existing.category,
      status: nextStatus,
      solution,
      assignedToId: nextAssignedToId,
      assignedToName:
        nextAssignedToId === existing.assignedToId
          ? (existing.assignedTo?.name ?? null)
          : (assignee?.name ?? null),
      observerIds: nextObserverIds,
    };

    const now = new Date();
    const slaTimestamps = applySlaTimestamps(existing, nextStatus, now);
    const eventDrafts = buildUpdateEvents(before, after);
    const observersChanged = eventDrafts.some((draft) => draft.type === "OBSERVERS_CHANGED");

    // Alteração, observadores e eventos do histórico são gravados numa única escrita (atômica).
    const ticket = await this.tickets.update(id, {
      ...(input.title !== undefined ? { title: after.title } : {}),
      ...(input.description !== undefined ? { description: after.description } : {}),
      ...(input.priority !== undefined ? { priority: after.priority } : {}),
      ...(input.category !== undefined ? { category: after.category } : {}),
      ...(input.status !== undefined ? { status: nextStatus } : {}),
      ...(assigneeInput !== undefined
        ? nextAssignedToId
          ? { assignedTo: { connect: { id: nextAssignedToId } } }
          : { assignedTo: { disconnect: true } }
        : {}),
      ...(input.solution !== undefined ? { solution } : {}),
      ...slaTimestamps,
      ...(observersChanged
        ? {
            observers: {
              deleteMany: {},
              create: nextObserverIds.map((userId) => ({ user: { connect: { id: userId } } })),
            },
          }
        : {}),
      ...(eventDrafts.length > 0 ? { events: eventWrites(eventDrafts, auth.userId) } : {}),
    });

    return toPublicTicket(ticket);
  }

  async listEvents(id: string, auth: AuthContext): Promise<PublicTicketEvent[]> {
    const ticket = await this.tickets.findById(id);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    assertTicketAccess(ticket, auth);

    const rows = await this.events.findByTicketId(id);
    return rows.map(toPublicTicketEvent);
  }

  async deleteTicket(id: string, auth: AuthContext): Promise<void> {
    const existing = await this.tickets.findById(id);

    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    assertTicketAccess(existing, auth);

    // Exclusão física só para chamados abertos por engano: chamados resolvidos/encerrados
    // ou com tempo apontado fazem parte do histórico de SLA e de rentabilidade.
    if (existing.status === "RESOLVED" || existing.status === "CLOSED") {
      throw new ConflictError("Resolved or closed tickets cannot be deleted");
    }

    if ((await this.tickets.countTimeEntries(id)) > 0) {
      throw new ConflictError("Tickets with logged time cannot be deleted");
    }

    await this.attachments.deleteAllForTicket(id);
    await this.tickets.delete(id);
  }

  private async ensureActiveContract(contractId: string) {
    const contract = await this.contracts.findById(contractId);

    if (!contract || contract.status !== "ACTIVE") {
      throw new BadRequestError("Contract not found or not active");
    }

    // Chamado só em contrato vigente hoje (datas do contrato são dias UTC).
    const today = new Date().toISOString().slice(0, 10);
    const startsOn = contract.startDate.toISOString().slice(0, 10);
    const endsOn = contract.endDate ? contract.endDate.toISOString().slice(0, 10) : null;

    if (startsOn > today || (endsOn !== null && endsOn < today)) {
      throw new BadRequestError("Contract is not in effect today");
    }

    return contract;
  }

  private async ensureActiveAssignee(userId: string) {
    const user = await this.users.findById(userId);

    if (!user || !user.active) {
      throw new BadRequestError("Assignee not found or inactive");
    }

    return user;
  }

  private async normalizeObserverIds(
    observerIds: string[],
    assignedToId: string | null,
  ): Promise<string[]> {
    const unique = observerIds.filter((userId) => userId !== assignedToId);

    for (const userId of unique) {
      const user = await this.users.findById(userId);
      if (!user || !user.active) {
        throw new BadRequestError("Observer not found or inactive");
      }
    }

    return unique;
  }
}

export const ticketService = new TicketService();
