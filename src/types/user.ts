import type { Role } from "@prisma/client";

// Public user shape returned by API routes (never expose passwordHash).

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  hourlyCost: string;
  active: boolean;
};

/** Visão de colega para o técnico: sem dados financeiros (custo/hora). */
export type PublicUserSummary = Omit<PublicUser, "hourlyCost">;

export function toUserSummary(user: PublicUser): PublicUserSummary {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active };
}

export type CreateUserInput = {
  name: string;
  email: string;
  role: Role;
  hourlyCost: number | string;
  password: string;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: Role;
  hourlyCost?: number | string;
  active?: boolean;
  /** Quando informado, redefine a senha do usuário. */
  password?: string;
};

export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  hourlyCost: { toString(): string };
  active: boolean;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    hourlyCost: user.hourlyCost.toString(),
    active: user.active,
  };
}
