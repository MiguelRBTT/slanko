import { jsonError, jsonOk } from "@/lib/http/api-response";
import { parseSlaPeriodFilters } from "@/lib/sla/period-filters";
import { slaService } from "@/services/sla.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/sla/contracts/:id - SLA report for a single contract (requires JWT; gestor only).

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);

    const report = await slaService.getContractReport(id, parseSlaPeriodFilters(searchParams));

    return jsonOk({ report });
  } catch (error) {
    return jsonError(error);
  }
}
