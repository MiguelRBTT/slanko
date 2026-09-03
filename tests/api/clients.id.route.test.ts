import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PUT } from "@/app/api/clients/[id]/route";
import { clientService } from "@/services/client.service";
import { NotFoundError } from "@/lib/errors/app-error";

vi.mock("@/services/client.service", () => ({
  clientService: {
    getClientById: vi.fn(),
    updateClient: vi.fn(),
    deactivateClient: vi.fn(),
  },
}));

const routeContext = { params: Promise.resolve({ id: "client-1" }) };

const sampleClient = {
  id: "client-1",
  name: "Tech Solutions Ltda",
  document: null,
  email: null,
  phone: null,
  active: true,
};

describe("GET /api/clients/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a client by id", async () => {
    vi.mocked(clientService.getClientById).mockResolvedValue(sampleClient);

    const response = await GET(new Request("http://localhost"), routeContext);
    const body = await response.json();

    expect(clientService.getClientById).toHaveBeenCalledWith("client-1", true);
    expect(response.status).toBe(200);
    expect(body.client.id).toBe("client-1");
  });

  it("returns 404 when client is not found", async () => {
    vi.mocked(clientService.getClientById).mockRejectedValue(new NotFoundError("Client not found"));

    const response = await GET(new Request("http://localhost"), routeContext);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Client not found");
  });
});

describe("PUT /api/clients/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a client", async () => {
    vi.mocked(clientService.updateClient).mockResolvedValue({ ...sampleClient, name: "Updated" });

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.client.name).toBe("Updated");
  });

  it("returns 404 when updating a missing client", async () => {
    vi.mocked(clientService.updateClient).mockRejectedValue(new NotFoundError("Client not found"));

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/clients/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deactivates a client", async () => {
    vi.mocked(clientService.deactivateClient).mockResolvedValue({ ...sampleClient, active: false });

    const response = await DELETE(new Request("http://localhost"), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.client.active).toBe(false);
  });

  it("returns 404 when deactivating a missing client", async () => {
    vi.mocked(clientService.deactivateClient).mockRejectedValue(
      new NotFoundError("Client not found"),
    );

    const response = await DELETE(new Request("http://localhost"), routeContext);

    expect(response.status).toBe(404);
  });
});
