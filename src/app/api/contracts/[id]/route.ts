import { jsonError, jsonOk } from "@/lib/http/api-response";
import { contractService } from "@/services/contract.service";
import type { UpdateContractInput } from "@/types/contract";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/contracts/:id - fetch contract by id.
// PUT /api/contracts/:id - update contract.
// DELETE /api/contracts/:id - delete contract when it has no tickets.

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const contract = await contractService.getContractById(id);

    return jsonOk({ contract });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateContractInput;
    const contract = await contractService.updateContract(id, body);

    return jsonOk({ contract });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await contractService.deleteContract(id);

    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
