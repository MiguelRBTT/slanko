import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors/app-error";
import { ClientService } from "@/services/client.service";
import type { ClientRepository } from "@/repositories/client.repository";

// Unit tests for ClientService list and lookup rules.

const sampleClient = {
  id: "client-1",
  name: "Tech Solutions Ltda",
  document: "12.345.678/0001-90",
  email: "contato@techsolutions.local",
  phone: "(48) 99999-0000",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ClientService", () => {
  const mockRepository: ClientRepository = {
    findAllActive: vi.fn(),
    findById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active clients", async () => {
    vi.mocked(mockRepository.findAllActive).mockResolvedValue([sampleClient]);

    const service = new ClientService(mockRepository);
    const clients = await service.listActiveClients();

    expect(clients).toHaveLength(1);
    expect(clients[0].name).toBe("Tech Solutions Ltda");
  });

  it("returns a client by id", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(sampleClient);

    const service = new ClientService(mockRepository);
    const client = await service.getClientById("client-1");

    expect(client.email).toBe("contato@techsolutions.local");
  });

  it("throws NotFoundError when client is missing", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const service = new ClientService(mockRepository);

    await expect(service.getClientById("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
