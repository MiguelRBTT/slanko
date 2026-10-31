import { beforeEach, describe, expect, it, vi } from "vitest";
import { gestorRequest, tecnicoRequest } from "../helpers/auth-request";
import { GET as listUsers, POST as createUser } from "@/app/api/users/route";
import { GET as getUserById, PUT as updateUser } from "@/app/api/users/[id]/route";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { userService } from "@/services/user.service";
import { NotFoundError } from "@/lib/errors/app-error";

// API route tests for user endpoints with mocked UserService.

vi.mock("@/services/user.service", () => ({
  userService: {
    listActiveUsers: vi.fn(),
    listAllUsers: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
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

    const response = await listUsers(gestorRequest("http://localhost/api/users"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
  });
});

function authedRequest(url: string, role: "GESTOR" | "TECNICO", init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      [USER_ID_HEADER]: "user-1",
      [USER_EMAIL_HEADER]: "user@slanko.local",
      [USER_ROLE_HEADER]: role,
    },
  });
}

const publicUser = {
  id: "user-2",
  name: "Bruno",
  email: "bruno@slanko.local",
  role: "TECNICO" as const,
  hourlyCost: "90.00",
  active: true,
};

describe("user management routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists inactive users only for gestor", async () => {
    vi.mocked(userService.listAllUsers).mockResolvedValue([publicUser]);

    const ok = await listUsers(authedRequest("http://localhost/api/users?includeInactive=true", "GESTOR"));
    expect(ok.status).toBe(200);

    const forbidden = await listUsers(
      authedRequest("http://localhost/api/users?includeInactive=true", "TECNICO"),
    );
    expect(forbidden.status).toBe(403);
  });

  it("creates a user as gestor and blocks tecnico", async () => {
    vi.mocked(userService.createUser).mockResolvedValue(publicUser);
    const body = JSON.stringify({ name: "Bruno" });

    const created = await createUser(
      authedRequest("http://localhost/api/users", "GESTOR", { method: "POST", body }),
    );
    expect(created.status).toBe(201);

    const forbidden = await createUser(
      authedRequest("http://localhost/api/users", "TECNICO", { method: "POST", body }),
    );
    expect(forbidden.status).toBe(403);
    expect(userService.createUser).toHaveBeenCalledTimes(1);
  });

  it("updates a user as gestor passing the acting user", async () => {
    vi.mocked(userService.updateUser).mockResolvedValue(publicUser);

    const response = await updateUser(
      authedRequest("http://localhost/api/users/user-2", "GESTOR", {
        method: "PUT",
        body: JSON.stringify({ hourlyCost: 95 }),
      }),
      { params: Promise.resolve({ id: "user-2" }) },
    );

    expect(response.status).toBe(200);
    expect(userService.updateUser).toHaveBeenCalledWith(
      "user-2",
      { hourlyCost: 95 },
      expect.objectContaining({ userId: "user-1", role: "GESTOR" }),
    );
  });

  it("blocks tecnico from updating users", async () => {
    const response = await updateUser(
      authedRequest("http://localhost/api/users/user-2", "TECNICO", {
        method: "PUT",
        body: JSON.stringify({ hourlyCost: 1 }),
      }),
      { params: Promise.resolve({ id: "user-2" }) },
    );

    expect(response.status).toBe(403);
    expect(userService.updateUser).not.toHaveBeenCalled();
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

    const response = await getUserById(gestorRequest("http://localhost"), {
      params: Promise.resolve({ id: "user-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id).toBe("user-1");
  });

  it("returns 404 when user is not found", async () => {
    vi.mocked(userService.getUserById).mockRejectedValue(new NotFoundError("User not found"));

    const response = await getUserById(gestorRequest("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });

  it("hides hourly cost of other people from tecnico", async () => {
    vi.mocked(userService.listActiveUsers).mockResolvedValue([publicUser]);
    vi.mocked(userService.getUserById).mockResolvedValue(publicUser);

    const list = await (await listUsers(tecnicoRequest("http://localhost/api/users"))).json();
    expect(list.users[0]).not.toHaveProperty("hourlyCost");

    const other = await (
      await getUserById(tecnicoRequest("http://localhost"), { params: Promise.resolve({ id: "user-2" }) })
    ).json();
    expect(other.user).not.toHaveProperty("hourlyCost");

    const self = await (
      await getUserById(tecnicoRequest("http://localhost"), { params: Promise.resolve({ id: "user-tecnico" }) })
    ).json();
    expect(self.user.hourlyCost).toBe("90.00");
  });
});
