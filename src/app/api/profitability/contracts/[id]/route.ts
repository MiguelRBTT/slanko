import { jsonError, jsonOk } from "@/lib/http/api-response";
import { assertGestor } from "@/lib/auth/require-gestor";
import { parseProfitabilityPeriodFilters } from "@/lib/profitability/period-filters";
import { profitabilityService } from "@/services/profitability.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/profitability/contracts/:id - rentabilidade de um contrato (só gestor).

export async function GET(request: Request, context: RouteContext) {
  try {
    assertGestor(request);
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);

    const report = await profitabilityService.getContractReport(
      id,
      parseProfitabilityPeriodFilters(searchParams),
    );

    return jsonOk({ report });
  } catch (error) {
    return jsonError(error);
  }
}
