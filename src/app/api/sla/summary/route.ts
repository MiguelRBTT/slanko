import { jsonError, jsonOk } from "@/lib/http/api-response";
import { parseSlaPeriodFilters } from "@/lib/sla/period-filters";
import { slaService } from "@/services/sla.service";

// GET /api/sla/summary - SLA overview for active contracts (requires JWT; gestor only).

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const contractId = searchParams.get("contractId") ?? undefined;

    const summary = await slaService.getSummary({
      clientId,
      contractId,
      ...parseSlaPeriodFilters(searchParams),
    });

    return jsonOk({ summary });
  } catch (error) {
    return jsonError(error);
  }
}
