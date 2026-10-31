import { jsonError, jsonOk } from "@/lib/http/api-response";
import { assertGestor } from "@/lib/auth/require-gestor";
import { parseContractStatusFilter } from "@/lib/reports/contract-status-filter";
import { parseSlaPeriodFilters } from "@/lib/sla/period-filters";
import { slaService } from "@/services/sla.service";

// GET /api/sla/summary - SLA overview (requires JWT; gestor only). status=ACTIVE|SUSPENDED|FINISHED|ALL.

export async function GET(request: Request) {
  try {
    assertGestor(request);
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const contractId = searchParams.get("contractId") ?? undefined;

    const summary = await slaService.getSummary({
      clientId,
      contractId,
      contractStatuses: parseContractStatusFilter(searchParams),
      ...parseSlaPeriodFilters(searchParams),
    });

    return jsonOk({ summary });
  } catch (error) {
    return jsonError(error);
  }
}
