import { ClientRepository, clientRepository } from "@/repositories/client.repository";
import { NotFoundError } from "@/lib/errors/app-error";

// Business rules for client listing and lookup.

export type PublicClient = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
};

function toPublicClient(client: {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
}): PublicClient {
  return {
    id: client.id,
    name: client.name,
    document: client.document,
    email: client.email,
    phone: client.phone,
    active: client.active,
  };
}

export class ClientService {
  constructor(private readonly clients: ClientRepository = clientRepository) {}

  async listActiveClients(): Promise<PublicClient[]> {
    const rows = await this.clients.findAllActive();
    return rows.map(toPublicClient);
  }

  async getClientById(id: string): Promise<PublicClient> {
    const client = await this.clients.findById(id);

    if (!client || !client.active) {
      throw new NotFoundError("Client not found");
    }

    return toPublicClient(client);
  }
}

export const clientService = new ClientService();
