import { jsonError, jsonOk } from "@/lib/http/api-response";
import { userService } from "@/services/user.service";

// GET /api/users - list active users (requires JWT; gestor and tecnico).

export async function GET() {
  try {
    const users = await userService.listActiveUsers();
    return jsonOk({ users });
  } catch (error) {
    return jsonError(error);
  }
}
