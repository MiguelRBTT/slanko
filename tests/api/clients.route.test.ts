import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/clients/route";
import { clientService } from "@/services/client.service";
import { BadRequestError } from "@/lib/errors/app-error";

vi.mock("@/services/client.service", () => ({
  clientService: {
    listClients: vi.fn(),
    createClient: vi.fn(),
  },
}));

const sampleClient = {
  id: "client-1",
  name: "Tech Solutions Ltda",
  document: "12.345.678/0001-90",
  email: "contato@techsolutions.local",
  phone: "(48) 99999-0000",
  active: true,
};

describe("GET /api/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active clients as JSON", async () => {
    vi.mocked(clientService.listClients).mockResolvedValue([sampleClient]);

    const response = await GET(new Request("http://localhost/api/clients"));
    const body = await response.json();

    expect(clientService.listClients).toHaveBeenCalledWith(false);
    expect(response.status).toBe(200);
    expect(body.clients[0].name).toBe("Tech Solutions Ltda");
  });

  it("includes inactive clients when requested", async () => {
    vi.mocked(clientService.listClients).mockResolvedValue([{ ...sampleClient, active: false }]);

    const response = await GET(
      new Request("http://localhost/api/clients?includeInactive=true"),
    );
    const body = await response.json();

    expect(clientService.listClients).toHaveBeenCalledWith(true);
    expect(body.clients[0].active).toBe(false);
  });

  it("returns 500 when listing fails unexpectedly", async () => {
    vi.mocked(clientService.listClients).mockRejectedValue(new Error("database unavailable"));

    const response = await GET(new Request("http://localhost/api/clients"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});

describe("POST /api/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a client and returns 201", async () => {
    vi.mocked(clientService.createClient).mockResolvedValue(sampleClient);

    const response = await POST(
      new Request("http://localhost/api/clients", {
        method: "POST",
        body: JSON.stringify({ name: "Tech Solutions Ltda" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.client.id).toBe("client-1");
  });

  it("returns validation errors from the service", async () => {
    vi.mocked(clientService.createClient).mockRejectedValue(new BadRequestError("name is required"));

    const response = await POST(
      new Request("http://localhost/api/clients", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("name is required");
  });
});
