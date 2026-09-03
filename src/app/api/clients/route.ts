import { jsonError, jsonOk } from "@/lib/http/api-response";
import { clientService } from "@/services/client.service";
import type { CreateClientInput } from "@/types/client";

// GET /api/clients - list clients (requires JWT; gestor only).
// POST /api/clients - create client.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const clients = await clientService.listClients(includeInactive);

    return jsonOk({ clients });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateClientInput;
    const client = await clientService.createClient(body);

    return jsonOk({ client }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
