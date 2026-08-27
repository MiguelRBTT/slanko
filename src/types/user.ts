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
