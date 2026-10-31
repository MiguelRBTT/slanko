import { jsonError, jsonOk } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/request-body";
import { assertGestor } from "@/lib/auth/require-gestor";
import { clientService } from "@/services/client.service";
import type { CreateClientInput } from "@/types/client";

// GET /api/clients - list clients (requires JWT; gestor only).
// POST /api/clients - create client.

export async function GET(request: Request) {
  try {
    assertGestor(request);
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
    assertGestor(request);
    const body = await readJsonBody<CreateClientInput>(request);
    const client = await clientService.createClient(body);

    return jsonOk({ client }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
