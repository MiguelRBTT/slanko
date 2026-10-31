import { jsonError, jsonOk } from "@/lib/http/api-response";
import { assertGestor } from "@/lib/auth/require-gestor";
import { parseContractStatusFilter } from "@/lib/reports/contract-status-filter";
import { parseProfitabilityPeriodFilters } from "@/lib/profitability/period-filters";
import { profitabilityService } from "@/services/profitability.service";

// GET /api/profitability/summary - profitability overview (requires JWT; gestor only). status=ACTIVE|SUSPENDED|FINISHED|ALL.

export async function GET(request: Request) {
  try {
    assertGestor(request);
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const contractId = searchParams.get("contractId") ?? undefined;

    const summary = await profitabilityService.getSummary({
      clientId,
      contractId,
      contractStatuses: parseContractStatusFilter(searchParams),
      ...parseProfitabilityPeriodFilters(searchParams),
    });

    return jsonOk({ summary });
  } catch (error) {
    return jsonError(error);
  }
}
