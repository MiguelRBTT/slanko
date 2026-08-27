import type { Role } from "@prisma/client";

export type AuthContext = {
  userId: string;
  email: string;
  role: Role;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    hourlyCost: string;
    active: boolean;
  };
};

export type JwtClaims = {
  sub: string;
  email: string;
  role: Role;
};
