import { jsonError, jsonOk } from "@/lib/http/api-response";
import { userService } from "@/services/user.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/users/:id - fetch a single active user by id.

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await userService.getUserById(id);
    return jsonOk({ user });
  } catch (error) {
    return jsonError(error);
  }
}
