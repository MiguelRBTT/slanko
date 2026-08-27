import { UnauthorizedError } from "@/lib/errors/app-error";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken } from "@/lib/auth/jwt";
import { UserRepository, userRepository } from "@/repositories/user.repository";
import { toPublicUser } from "@/types/user";
import type { LoginInput, LoginResult } from "@/types/auth";

export class AuthService {
  constructor(private readonly users: UserRepository = userRepository) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();

    if (!email || !input.password) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const user = await this.users.findByEmail(email);

    if (!user || !user.active) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = await signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: toPublicUser(user),
    };
  }
}

export const authService = new AuthService();
