import { ClientRepository, clientRepository } from "@/repositories/client.repository";
import { NotFoundError } from "@/lib/errors/app-error";
import {
  optionalNullableString,
  requireNonEmptyString,
} from "@/lib/validation/fields";
import {
  toPublicClient,
  type CreateClientInput,
  type PublicClient,
  type UpdateClientInput,
} from "@/types/client";

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
      email: optionalNullableString(input.email) ?? null,
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
        ? { email: optionalNullableString(input.email) as string | null }
        : {}),
      ...(input.phone !== undefined
        ? { phone: optionalNullableString(input.phone) as string | null }
        : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });

    return toPublicClient(client);
  }

  async deactivateClient(id: string): Promise<PublicClient> {
    return this.updateClient(id, { active: false });
  }
}

export const clientService = new ClientService();
