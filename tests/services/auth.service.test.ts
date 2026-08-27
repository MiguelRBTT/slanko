import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/lib/errors/app-error";
import { AuthService } from "@/services/auth.service";
import type { UserRepository } from "@/repositories/user.repository";

vi.mock("@/lib/auth/jwt", () => ({
  signAccessToken: vi.fn().mockResolvedValue("signed-token"),
}));

vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(),
}));

import { signAccessToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";

const sampleUser = {
  id: "user-1",
  name: "Ana Gestora",
  email: "gestor@slanko.local",
  passwordHash: "hashed-secret",
  role: "GESTOR" as const,
  hourlyCost: { toString: () => "0.00" },
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AuthService", () => {
  const mockRepository: UserRepository = {
    findAllActive: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a token and public user for valid credentials", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(sampleUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const service = new AuthService(mockRepository);
    const result = await service.login({
      email: "gestor@slanko.local",
      password: "Slanko@123",
    });

    expect(signAccessToken).toHaveBeenCalledWith({
      userId: "user-1",
      email: "gestor@slanko.local",
      role: "GESTOR",
    });
    expect(result.token).toBe("signed-token");
    expect(result.user.email).toBe("gestor@slanko.local");
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("normalizes email before lookup", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(sampleUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const service = new AuthService(mockRepository);
    await service.login({ email: "  GESTOR@Slanko.local ", password: "Slanko@123" });

    expect(mockRepository.findByEmail).toHaveBeenCalledWith("gestor@slanko.local");
  });

  it("rejects unknown users", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(null);

    const service = new AuthService(mockRepository);

    await expect(
      service.login({ email: "missing@slanko.local", password: "Slanko@123" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects invalid passwords", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValue(sampleUser);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const service = new AuthService(mockRepository);

    await expect(
      service.login({ email: "gestor@slanko.local", password: "wrong" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects inactive users", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValue({ ...sampleUser, active: false });

    const service = new AuthService(mockRepository);

    await expect(
      service.login({ email: "gestor@slanko.local", password: "Slanko@123" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
