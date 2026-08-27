import { NotFoundError } from "@/lib/errors/app-error";
import { toPublicUser, type PublicUser } from "@/types/user";
import { UserRepository, userRepository } from "@/repositories/user.repository";

// Business rules for user listing and lookup (passwords never leave this layer exposed).

export class UserService {
  constructor(private readonly users: UserRepository = userRepository) {}

  async listActiveUsers(): Promise<PublicUser[]> {
    const users = await this.users.findAllActive();
    return users.map(toPublicUser);
  }

  async getUserById(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);

    if (!user || !user.active) {
      throw new NotFoundError("User not found");
    }

    return toPublicUser(user);
  }
}

export const userService = new UserService();
