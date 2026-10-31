import { jsonError, jsonOk } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/request-body";
import { assertGestor } from "@/lib/auth/require-gestor";
import { clientService } from "@/services/client.service";
import type { UpdateClientInput } from "@/types/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/clients/:id - fetch client by id.
// PUT /api/clients/:id - update client.
// DELETE /api/clients/:id - deactivate client (soft delete).

export async function GET(request: Request, context: RouteContext) {
  try {
    assertGestor(request);
    const { id } = await context.params;
    const client = await clientService.getClientById(id, true);

    return jsonOk({ client });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertGestor(request);
    const { id } = await context.params;
    const body = await readJsonBody<UpdateClientInput>(request);
    const client = await clientService.updateClient(id, body);

    return jsonOk({ client });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertGestor(request);
    const { id } = await context.params;
    const client = await clientService.deactivateClient(id);

    return jsonOk({ client });
  } catch (error) {
    return jsonError(error);
  }
}
