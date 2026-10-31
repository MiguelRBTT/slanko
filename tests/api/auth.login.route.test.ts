import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { authService } from "@/services/auth.service";
import { UnauthorizedError } from "@/lib/errors/app-error";

vi.mock("@/services/auth.service", () => ({
  authService: {
    login: vi.fn(),
  },
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns token and user on successful login", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      token: "jwt-token",
      user: {
        id: "user-1",
        name: "Ana Gestora",
        email: "gestor@slanko.local",
        role: "GESTOR",
        hourlyCost: "0.00",
        active: true,
      },
    });

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "gestor@slanko.local",
        password: "Slanko@123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe("jwt-token");
    expect(body.user.email).toBe("gestor@slanko.local");
  });

  it("returns 401 for invalid credentials", async () => {
    vi.mocked(authService.login).mockRejectedValue(new UnauthorizedError("Invalid email or password"));

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "gestor@slanko.local",
        password: "wrong",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid email or password");
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/login", { method: "POST", body: "{oops" }),
    );

    expect(response.status).toBe(400);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("blocks brute force with 429 and Retry-After after repeated failures", async () => {
    vi.mocked(authService.login).mockRejectedValue(new UnauthorizedError("Invalid email or password"));
    const attempt = () =>
      POST(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.7" },
          body: JSON.stringify({ email: "alvo@slanko.local", password: "errada" }),
        }),
      );

    for (let i = 0; i < 5; i += 1) {
      expect((await attempt()).status).toBe(401);
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(authService.login).toHaveBeenCalledTimes(5);
  });
});
