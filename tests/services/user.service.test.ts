import { beforeEach, describe, expect, it, vi } from "vitest";
import { decimal } from "../helpers/fixtures";
import bcrypt from "bcryptjs";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors/app-error";
import { UserService } from "@/services/user.service";
import type { UserRepository } from "@/repositories/user.repository";

// Unit tests for UserService; ensures password hashes are never exposed.

const sampleUser = {
  id: "user-1",
  name: "Ana Gestora",
  email: "gestor@slanko.local",
  passwordHash: "hashed-secret",
  role: "GESTOR" as const,
  hourlyCost: decimal("0.00"),
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("UserService", () => {
  const mockRepository = {
    findAllActive: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as UserRepository;

  const gestorActor = { userId: "user-1", email: "gestor@slanko.local", role: "GESTOR" as const };

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

  it("lists all users, including inactive ones", async () => {
    vi.mocked(mockRepository.findAll).mockResolvedValue([sampleUser, { ...sampleUser, id: "user-2", active: false }] as never);

    const service = new UserService(mockRepository);
    const users = await service.listAllUsers();

    expect(users).toHaveLength(2);
    expect(users[1].active).toBe(false);
  });

  it("creates a user with a hashed password and normalized email", async () => {
    vi.mocked(mockRepository.create).mockImplementation(
      ((data: { name: string; email: string; role: "GESTOR" | "TECNICO"; passwordHash: string; hourlyCost: number }) =>
        Promise.resolve({
          ...sampleUser,
          id: "user-new",
          name: data.name,
          email: data.email,
          role: data.role,
          passwordHash: data.passwordHash,
          hourlyCost: decimal(String(data.hourlyCost)),
        })) as never,
    );

    const service = new UserService(mockRepository);
    const user = await service.createUser({
      name: "  Bruno Tecnico ",
      email: "Bruno@Slanko.Local",
      role: "TECNICO",
      hourlyCost: "92.5",
      password: "Senha@123",
    });

    const data = vi.mocked(mockRepository.create).mock.calls[0][0];
    expect(data.email).toBe("bruno@slanko.local");
    expect(data.hourlyCost).toBe(92.5);
    expect(await bcrypt.compare("Senha@123", data.passwordHash)).toBe(true);
    expect(user).not.toHaveProperty("passwordHash");
    expect(user.name).toBe("Bruno Tecnico");
  });

  it("validates user creation input", async () => {
    const service = new UserService(mockRepository);
    const valid = {
      name: "Bruno",
      email: "bruno@slanko.local",
      role: "TECNICO" as const,
      hourlyCost: 90,
      password: "Senha@123",
    };

    await expect(service.createUser({ ...valid, email: "invalido" })).rejects.toBeInstanceOf(BadRequestError);
    await expect(service.createUser({ ...valid, role: "ADMIN" as never })).rejects.toBeInstanceOf(BadRequestError);
    await expect(service.createUser({ ...valid, hourlyCost: 0 })).rejects.toBeInstanceOf(BadRequestError);
    await expect(service.createUser({ ...valid, password: "curta" })).rejects.toBeInstanceOf(BadRequestError);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already in use", async () => {
    vi.mocked(mockRepository.create).mockRejectedValue({ code: "P2002" });

    const service = new UserService(mockRepository);
    await expect(
      service.createUser({
        name: "Bruno",
        email: "gestor@slanko.local",
        role: "TECNICO",
        hourlyCost: 90,
        password: "Senha@123",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("updates hourly cost, status and resets the password", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({ ...sampleUser, id: "user-2", role: "TECNICO" } as never);
    vi.mocked(mockRepository.update).mockResolvedValue({ ...sampleUser, id: "user-2" } as never);

    const service = new UserService(mockRepository);
    await service.updateUser("user-2", { hourlyCost: "110", active: false, password: "NovaSenha1" }, gestorActor);

    const [, data] = vi.mocked(mockRepository.update).mock.calls[0];
    expect(data.hourlyCost).toBe(110);
    expect(data.active).toBe(false);
    expect(await bcrypt.compare("NovaSenha1", data.passwordHash as string)).toBe(true);
  });

  it("prevents the gestor from deactivating or demoting themselves", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(sampleUser as never);

    const service = new UserService(mockRepository);
    await expect(service.updateUser("user-1", { active: false }, gestorActor)).rejects.toBeInstanceOf(BadRequestError);
    await expect(service.updateUser("user-1", { role: "TECNICO" }, gestorActor)).rejects.toBeInstanceOf(BadRequestError);
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it("rejects updates for unknown users and invalid flags", async () => {
    const service = new UserService(mockRepository);

    vi.mocked(mockRepository.findById).mockResolvedValue(null);
    await expect(service.updateUser("missing", { name: "X" }, gestorActor)).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockRepository.findById).mockResolvedValue({ ...sampleUser, id: "user-2" } as never);
    await expect(
      service.updateUser("user-2", { active: "false" as never }, gestorActor),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("maps duplicate email on update to 409", async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({ ...sampleUser, id: "user-2" } as never);
    vi.mocked(mockRepository.update).mockRejectedValue({ code: "P2002" });

    const service = new UserService(mockRepository);
    await expect(
      service.updateUser("user-2", { email: "gestor@slanko.local" }, gestorActor),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
