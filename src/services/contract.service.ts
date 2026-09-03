import type { ContractStatus } from "@prisma/client";
import { ClientRepository, clientRepository } from "@/repositories/client.repository";
import { ContractRepository, contractRepository } from "@/repositories/contract.repository";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors/app-error";
import {
  assertEndDateAfterStartDate,
  isUniqueConstraintError,
  optionalNullableString,
  parseDateOnly,
  parseOptionalDateOnly,
  parsePositiveInteger,
  parsePositiveNumber,
  requireNonEmptyString,
} from "@/lib/validation/fields";
import {
  toPublicContract,
  type CreateContractInput,
  type PublicContract,
  type UpdateContractInput,
} from "@/types/contract";

const CONTRACT_STATUSES: ContractStatus[] = ["DRAFT", "ACTIVE", "SUSPENDED", "FINISHED"];

function parseContractStatus(value: unknown, field = "status"): ContractStatus {
  if (value === undefined) {
    throw new BadRequestError(`${field} is required`);
  }

  if (typeof value !== "string" || !CONTRACT_STATUSES.includes(value as ContractStatus)) {
    throw new BadRequestError(`${field} is invalid`);
  }

  return value as ContractStatus;
}

function parseOptionalContractStatus(value: unknown): ContractStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseContractStatus(value);
}

export class ContractService {
  constructor(
    private readonly contracts: ContractRepository = contractRepository,
    private readonly clients: ClientRepository = clientRepository,
  ) {}

  async listContracts(filters: {
    clientId?: string;
    status?: ContractStatus;
  } = {}): Promise<PublicContract[]> {
    const rows = await this.contracts.findMany(filters);
    return rows.map(toPublicContract);
  }

  async getContractById(id: string): Promise<PublicContract> {
    const contract = await this.contracts.findById(id);

    if (!contract) {
      throw new NotFoundError("Contract not found");
    }

    return toPublicContract(contract);
  }

  async createContract(input: CreateContractInput): Promise<PublicContract> {
    const clientId = requireNonEmptyString(input.clientId, "clientId");
    await this.ensureActiveClient(clientId);

    const startDate = parseDateOnly(input.startDate, "startDate");
    const endDate = parseOptionalDateOnly(input.endDate, "endDate") ?? null;
    assertEndDateAfterStartDate(startDate, endDate);

    try {
      const contract = await this.contracts.create({
        client: { connect: { id: clientId } },
        code: requireNonEmptyString(input.code, "code"),
        title: requireNonEmptyString(input.title, "title"),
        description: optionalNullableString(input.description) ?? null,
        value: parsePositiveNumber(input.value, "value"),
        startDate,
        endDate,
        status: input.status ? parseContractStatus(input.status) : "DRAFT",
        responseMinutes: parsePositiveInteger(input.responseMinutes, "responseMinutes"),
        resolutionMinutes: parsePositiveInteger(input.resolutionMinutes, "resolutionMinutes"),
      });

      return toPublicContract(contract);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError("Contract code already exists");
      }

      throw error;
    }
  }

  async updateContract(id: string, input: UpdateContractInput): Promise<PublicContract> {
    const existing = await this.contracts.findById(id);

    if (!existing) {
      throw new NotFoundError("Contract not found");
    }

    if (input.clientId) {
      await this.ensureActiveClient(input.clientId);
    }

    const startDate = input.startDate ? parseDateOnly(input.startDate, "startDate") : existing.startDate;
    const endDate =
      input.endDate !== undefined
        ? parseOptionalDateOnly(input.endDate, "endDate") ?? null
        : existing.endDate;

    assertEndDateAfterStartDate(startDate, endDate);

    try {
      const contract = await this.contracts.update(id, {
        ...(input.clientId ? { client: { connect: { id: input.clientId } } } : {}),
        ...(input.code !== undefined ? { code: requireNonEmptyString(input.code, "code") } : {}),
        ...(input.title !== undefined ? { title: requireNonEmptyString(input.title, "title") } : {}),
        ...(input.description !== undefined
          ? { description: optionalNullableString(input.description) ?? null }
          : {}),
        ...(input.value !== undefined ? { value: parsePositiveNumber(input.value, "value") } : {}),
        ...(input.startDate !== undefined ? { startDate } : {}),
        ...(input.endDate !== undefined ? { endDate } : {}),
        ...(input.status !== undefined ? { status: parseOptionalContractStatus(input.status) } : {}),
        ...(input.responseMinutes !== undefined
          ? { responseMinutes: parsePositiveInteger(input.responseMinutes, "responseMinutes") }
          : {}),
        ...(input.resolutionMinutes !== undefined
          ? { resolutionMinutes: parsePositiveInteger(input.resolutionMinutes, "resolutionMinutes") }
          : {}),
      });

      return toPublicContract(contract);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError("Contract code already exists");
      }

      throw error;
    }
  }

  async deleteContract(id: string): Promise<void> {
    await this.getContractById(id);

    const ticketCount = await this.contracts.countTickets(id);

    if (ticketCount > 0) {
      throw new ConflictError("Contract cannot be deleted while tickets exist");
    }

    await this.contracts.delete(id);
  }

  private async ensureActiveClient(clientId: string): Promise<void> {
    const client = await this.clients.findById(clientId);

    if (!client || !client.active) {
      throw new BadRequestError("Client not found or inactive");
    }
  }
}

export const contractService = new ContractService();
