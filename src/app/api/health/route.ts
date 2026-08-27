import { jsonError, jsonOk } from "@/lib/http/api-response";
import { healthService } from "@/services/health.service";

// GET /api/health - smoke check for the app and MySQL connectivity.

export async function GET() {
  try {
    const health = await healthService.check();
    const status = health.status === "ok" ? 200 : 503;

    return jsonOk(health, status);
  } catch (error) {
    return jsonError(error);
  }
}
