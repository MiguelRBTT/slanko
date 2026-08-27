import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/clients/route";
import { clientService } from "@/services/client.service";

// API route tests for GET /api/clients with mocked ClientService.

vi.mock("@/services/client.service", () => ({
  clientService: {
    listActiveClients: vi.fn(),
  },
}));

describe("GET /api/clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active clients as JSON", async () => {
    vi.mocked(clientService.listActiveClients).mockResolvedValue([
      {
        id: "client-1",
        name: "Tech Solutions Ltda",
        document: "12.345.678/0001-90",
        email: "contato@techsolutions.local",
        phone: "(48) 99999-0000",
        active: true,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.clients[0].name).toBe("Tech Solutions Ltda");
  });
});
