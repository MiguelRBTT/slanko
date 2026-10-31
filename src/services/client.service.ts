import { ClientRepository, clientRepository } from "@/repositories/client.repository";
import { BadRequestError, NotFoundError } from "@/lib/errors/app-error";
import {
  optionalNullableString,
  requireEmail,
  requireNonEmptyString,
} from "@/lib/validation/fields";

function optionalEmail(value: unknown): string | null | undefined {
  const email = optionalNullableString(value);
  return email ? requireEmail(email) : email;
}
import {
  toPublicClient,
  type CreateClientInput,
  type PublicClient,
  type UpdateClientInput,
} from "@/types/client";

function parseActiveFlag(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new BadRequestError("active must be a boolean");
  }

  return value;
}

export class ClientService {
  constructor(private readonly clients: ClientRepository = clientRepository) {}

  async listClients(includeInactive = false): Promise<PublicClient[]> {
    const rows = await this.clients.findMany({ includeInactive });
    return rows.map(toPublicClient);
  }

  async listActiveClients(): Promise<PublicClient[]> {
    return this.listClients(false);
  }

  async getClientById(id: string, includeInactive = false): Promise<PublicClient> {
    const client = await this.clients.findById(id);

    if (!client || (!includeInactive && !client.active)) {
      throw new NotFoundError("Client not found");
    }

    return toPublicClient(client);
  }

  async createClient(input: CreateClientInput): Promise<PublicClient> {
    const client = await this.clients.create({
      name: requireNonEmptyString(input.name, "name"),
      document: optionalNullableString(input.document) ?? null,
      email: optionalEmail(input.email) ?? null,
      phone: optionalNullableString(input.phone) ?? null,
    });

    return toPublicClient(client);
  }

  async updateClient(id: string, input: UpdateClientInput): Promise<PublicClient> {
    await this.getClientById(id, true);

    const client = await this.clients.update(id, {
      ...(input.name !== undefined ? { name: requireNonEmptyString(input.name, "name") } : {}),
      ...(input.document !== undefined
        ? { document: optionalNullableString(input.document) as string | null }
        : {}),
      ...(input.email !== undefined
        ? { email: optionalEmail(input.email) as string | null }
        : {}),
      ...(input.phone !== undefined
        ? { phone: optionalNullableString(input.phone) as string | null }
        : {}),
      ...(input.active !== undefined ? { active: parseActiveFlag(input.active) } : {}),
    });

    return toPublicClient(client);
  }

  async deactivateClient(id: string): Promise<PublicClient> {
    return this.updateClient(id, { active: false });
  }
}

export const clientService = new ClientService();
