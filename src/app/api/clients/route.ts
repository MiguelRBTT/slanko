import { jsonError, jsonOk } from "@/lib/http/api-response";
import { clientService } from "@/services/client.service";

// GET /api/clients - list active clients (requires JWT; gestor only).

export async function GET() {
  try {
    const clients = await clientService.listActiveClients();
    return jsonOk({ clients });
  } catch (error) {
    return jsonError(error);
  }
}
