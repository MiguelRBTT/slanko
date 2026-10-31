import type { Role } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors/app-error";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import {
  isUniqueConstraintError,
  parsePositiveNumber,
  requireEmail,
  requireNonEmptyString,
} from "@/lib/validation/fields";
import type { AuthContext } from "@/types/auth";
import {
  toPublicUser,
  type CreateUserInput,
  type PublicUser,
  type UpdateUserInput,
} from "@/types/user";
import { UserRepository, userRepository } from "@/repositories/user.repository";

// Business rules for user management (passwords never leave this layer exposed).

const ROLES: Role[] = ["GESTOR", "TECNICO"];

function parseRole(value: unknown): Role {
  if (typeof value !== "string" || !ROLES.includes(value as Role)) {
    throw new BadRequestError("role is invalid");
  }

  return value as Role;
}

function parsePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestError(`password must have at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  return value;
}

function parseActive(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new BadRequestError("active must be a boolean");
  }

  return value;
}

export class UserService {
  constructor(private readonly users: UserRepository = userRepository) {}

  async listActiveUsers(): Promise<PublicUser[]> {
    const users = await this.users.findAllActive();
    return users.map(toPublicUser);
  }

  async listAllUsers(): Promise<PublicUser[]> {
    const users = await this.users.findAll();
    return users.map(toPublicUser);
  }

  async getUserById(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);

    if (!user || !user.active) {
      throw new NotFoundError("User not found");
    }

    return toPublicUser(user);
  }

  async createUser(input: CreateUserInput): Promise<PublicUser> {
    const data = {
      name: requireNonEmptyString(input.name, "name"),
      email: requireEmail(input.email),
      role: parseRole(input.role),
      hourlyCost: parsePositiveNumber(input.hourlyCost, "hourlyCost"),
      passwordHash: await hashPassword(parsePassword(input.password)),
    };

    try {
      const user = await this.users.create(data);
      return toPublicUser(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError("Email already in use");
      }

      throw error;
    }
  }

  async updateUser(id: string, input: UpdateUserInput, actor: AuthContext): Promise<PublicUser> {
    const existing = await this.users.findById(id);

    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const role = input.role !== undefined ? parseRole(input.role) : undefined;
    const active = input.active !== undefined ? parseActive(input.active) : undefined;

    // Evita que o gestor se tranque fora do sistema.
    if (id === actor.userId && ((role && role !== existing.role) || active === false)) {
      throw new BadRequestError("You cannot change your own role or deactivate yourself");
    }

    try {
      const user = await this.users.update(id, {
        ...(input.name !== undefined ? { name: requireNonEmptyString(input.name, "name") } : {}),
        ...(input.email !== undefined ? { email: requireEmail(input.email) } : {}),
        ...(role ? { role } : {}),
        ...(input.hourlyCost !== undefined
          ? { hourlyCost: parsePositiveNumber(input.hourlyCost, "hourlyCost") }
          : {}),
        ...(active !== undefined ? { active } : {}),
        ...(input.password !== undefined
          ? { passwordHash: await hashPassword(parsePassword(input.password)) }
          : {}),
      });

      return toPublicUser(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError("Email already in use");
      }

      throw error;
    }
  }
}

export const userService = new UserService();
