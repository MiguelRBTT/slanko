import { jsonError, jsonOk } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/request-body";
import { assertGestor } from "@/lib/auth/require-gestor";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { contractService } from "@/services/contract.service";
import { toContractSummary, type UpdateContractInput } from "@/types/contract";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/contracts/:id - fetch contract by id (JWT).
// PUT / DELETE - gestor only.

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const contract = await contractService.getContractById(id);

    return jsonOk({ contract: auth.role === "GESTOR" ? contract : toContractSummary(contract) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertGestor(request);
    const { id } = await context.params;
    const body = await readJsonBody<UpdateContractInput>(request);
    const contract = await contractService.updateContract(id, body);

    return jsonOk({ contract });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertGestor(request);
    const { id } = await context.params;
    await contractService.deleteContract(id);

    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
