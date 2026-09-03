import { jsonError, jsonOk } from "@/lib/http/api-response";
import { parseProfitabilityPeriodFilters } from "@/lib/profitability/period-filters";
import { profitabilityService } from "@/services/profitability.service";

// GET /api/profitability/summary - profitability overview (requires JWT; gestor only).

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const contractId = searchParams.get("contractId") ?? undefined;

    const summary = await profitabilityService.getSummary({
      clientId,
      contractId,
      ...parseProfitabilityPeriodFilters(searchParams),
    });

    return jsonOk({ summary });
  } catch (error) {
    return jsonError(error);
  }
}
