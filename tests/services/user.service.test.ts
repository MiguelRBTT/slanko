import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors/app-error";
import { UserService } from "@/services/user.service";
import type { UserRepository } from "@/repositories/user.repository";

// Unit tests for UserService; ensures password hashes are never exposed.

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

describe("UserService", () => {
  const mockRepository: UserRepository = {
    findAllActive: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active users without passwordHash", async () => {
    vi.mocked(mockRepository.findAllActive).mockResolvedValue([sampleUser]);

    const service = new UserService(mockRepository);
    const users = await service.listActiveUsers();

    expect(users).toHaveLength(1);
    expect(users[0]).toEqual({
      id: "user-1",
      name: "Ana Gestora",
      email: "gestor@slanko.local",
      role: "GESTOR",
      hourlyCost: "0.00",
      active: true,
    });
    expect(users[0]).not.toHaveProperty("passwordHash");
  });

  it("returns a public user by id", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(sampleUser);

    const service = new UserService(mockRepository);
    const user = await service.getUserById("user-1");

    expect(user.email).toBe("gestor@slanko.local");
  });

  it("throws NotFoundError when user does not exist", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    const service = new UserService(mockRepository);

    await expect(service.getUserById("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when user is inactive", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({ ...sampleUser, active: false });

    const service = new UserService(mockRepository);

    await expect(service.getUserById("user-1")).rejects.toBeInstanceOf(NotFoundError);
  });
});
