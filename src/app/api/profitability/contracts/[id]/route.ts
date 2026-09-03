import { jsonError, jsonOk } from "@/lib/http/api-response";
import { parseProfitabilityPeriodFilters } from "@/lib/profitability/period-filters";
import { profitabilityService } from "@/services/profitability.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/profitability/contracts/:id - profitability report for one contract (gestor only).

export async function GET(request: Request, context: RouteContext) {
  try {
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
