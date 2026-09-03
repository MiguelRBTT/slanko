import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError, NotFoundError } from "@/lib/errors/app-error";
import { ClientService } from "@/services/client.service";
import type { ClientRepository } from "@/repositories/client.repository";

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
    findMany: vi.fn(),
    findAllActive: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active clients", async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([sampleClient]);

    const service = new ClientService(mockRepository);
    const clients = await service.listActiveClients();

    expect(mockRepository.findMany).toHaveBeenCalledWith({ includeInactive: false });
    expect(clients).toHaveLength(1);
  });

  it("lists clients including inactive ones", async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue([{ ...sampleClient, active: false }]);

    const service = new ClientService(mockRepository);
    const clients = await service.listClients(true);

    expect(mockRepository.findMany).toHaveBeenCalledWith({ includeInactive: true });
    expect(clients[0].active).toBe(false);
  });

  it("returns a client by id", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(sampleClient);

    const service = new ClientService(mockRepository);
    const client = await service.getClientById("client-1");

    expect(client.email).toBe("contato@techsolutions.local");
  });

  it("returns inactive clients when includeInactive is true", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({ ...sampleClient, active: false });

    const service = new ClientService(mockRepository);
    const client = await service.getClientById("client-1", true);

    expect(client.active).toBe(false);
  });

  it("throws NotFoundError when client is missing or inactive", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);
    const service = new ClientService(mockRepository);
    await expect(service.getClientById("missing")).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockRepository.findById).mockResolvedValue({ ...sampleClient, active: false });
    await expect(service.getClientById("client-1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("creates a client with only required fields", async () => {
    vi.mocked(mockRepository.create).mockResolvedValue({
      ...sampleClient,
      document: null,
      email: null,
      phone: null,
    });

    const service = new ClientService(mockRepository);
    await service.createClient({ name: "Tech Solutions Ltda" });

    expect(mockRepository.create).toHaveBeenCalledWith({
      name: "Tech Solutions Ltda",
      document: null,
      email: null,
      phone: null,
    });
  });

  it("creates a client", async () => {
    vi.mocked(mockRepository.create).mockResolvedValue(sampleClient);

    const service = new ClientService(mockRepository);
    const client = await service.createClient({
      name: "Tech Solutions Ltda",
      document: " 12.345.678/0001-90 ",
      email: "contato@techsolutions.local",
      phone: "(48) 99999-0000",
    });

    expect(mockRepository.create).toHaveBeenCalledWith({
      name: "Tech Solutions Ltda",
      document: "12.345.678/0001-90",
      email: "contato@techsolutions.local",
      phone: "(48) 99999-0000",
    });
    expect(client.name).toBe("Tech Solutions Ltda");
  });

  it("rejects invalid create payloads", async () => {
    const service = new ClientService(mockRepository);
    await expect(service.createClient({ name: "   " })).rejects.toBeInstanceOf(BadRequestError);
  });

  it("updates only provided client fields", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(sampleClient);
    vi.mocked(mockRepository.update).mockResolvedValue({ ...sampleClient, name: "Partial" });

    const service = new ClientService(mockRepository);
    await service.updateClient("client-1", { name: "Partial" });

    expect(mockRepository.update).toHaveBeenCalledWith("client-1", { name: "Partial" });
  });

  it("updates individual optional client fields", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(sampleClient);
    vi.mocked(mockRepository.update).mockResolvedValue(sampleClient);

    const service = new ClientService(mockRepository);

    await service.updateClient("client-1", { document: "11.111.111/0001-11" });
    expect(mockRepository.update).toHaveBeenLastCalledWith("client-1", {
      document: "11.111.111/0001-11",
    });

    await service.updateClient("client-1", { email: "email@example.com" });
    expect(mockRepository.update).toHaveBeenLastCalledWith("client-1", {
      email: "email@example.com",
    });

    await service.updateClient("client-1", { phone: "999" });
    expect(mockRepository.update).toHaveBeenLastCalledWith("client-1", { phone: "999" });
  });

  it("updates a client", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(sampleClient);
    vi.mocked(mockRepository.update).mockResolvedValue({ ...sampleClient, name: "Updated" });

    const service = new ClientService(mockRepository);
    const client = await service.updateClient("client-1", {
      name: "Updated",
      document: "99.999.999/0001-99",
      email: "updated@example.com",
      phone: "123",
      active: false,
    });

    expect(mockRepository.update).toHaveBeenCalledWith("client-1", {
      name: "Updated",
      document: "99.999.999/0001-99",
      email: "updated@example.com",
      phone: "123",
      active: false,
    });
    expect(client.name).toBe("Updated");
  });

  it("throws when updating a missing client", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const service = new ClientService(mockRepository);
    await expect(service.updateClient("missing", { name: "Updated" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("deactivates a client", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(sampleClient);
    vi.mocked(mockRepository.update).mockResolvedValue({ ...sampleClient, active: false });

    const service = new ClientService(mockRepository);
    const client = await service.deactivateClient("client-1");

    expect(client.active).toBe(false);
  });
});
