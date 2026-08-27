import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listUsers } from "@/app/api/users/route";
import { GET as getUserById } from "@/app/api/users/[id]/route";
import { userService } from "@/services/user.service";
import { NotFoundError } from "@/lib/errors/app-error";

// API route tests for user endpoints with mocked UserService.

vi.mock("@/services/user.service", () => ({
  userService: {
    listActiveUsers: vi.fn(),
    getUserById: vi.fn(),
  },
}));

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active users as JSON", async () => {
    vi.mocked(userService.listActiveUsers).mockResolvedValue([
      {
        id: "user-1",
        name: "Ana Gestora",
        email: "gestor@slanko.local",
        role: "GESTOR",
        hourlyCost: "0.00",
        active: true,
      },
    ]);

    const response = await listUsers();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
  });
});

describe("GET /api/users/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a single user", async () => {
    vi.mocked(userService.getUserById).mockResolvedValue({
      id: "user-1",
      name: "Ana Gestora",
      email: "gestor@slanko.local",
      role: "GESTOR",
      hourlyCost: "0.00",
      active: true,
    });

    const response = await getUserById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id).toBe("user-1");
  });

  it("returns 404 when user is not found", async () => {
    vi.mocked(userService.getUserById).mockRejectedValue(new NotFoundError("User not found"));

    const response = await getUserById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });
});
