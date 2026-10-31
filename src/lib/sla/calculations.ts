import type { SlaMetricEvaluation } from "@/types/sla";

const MS_PER_MINUTE = 60_000;

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_MINUTE);
}

function complianceRate(met: number, breached: number): number | null {
  const evaluated = met + breached;

  if (evaluated === 0) {
    return null;
  }

  return Number(((met / evaluated) * 100).toFixed(2));
}

/**
 * Avalia uma meta de SLA. Sem o evento (resposta/resolução), o chamado fica PENDING
 * enquanto ainda está dentro do prazo; passado o prazo, já é uma violação (BREACHED),
 * mesmo que o evento ainda não tenha acontecido.
 */
function evaluateSlaMetric(input: {
  openedAt: Date;
  completedAt: Date | null;
  targetMinutes: number;
  now: Date;
}): SlaMetricEvaluation {
  if (!input.completedAt) {
    const runningMinutes = Math.max(0, minutesBetween(input.openedAt, input.now));

    if (runningMinutes > input.targetMinutes) {
      return {
        status: "BREACHED",
        elapsedMinutes: runningMinutes,
        targetMinutes: input.targetMinutes,
      };
    }

    return {
      status: "PENDING",
      elapsedMinutes: null,
      targetMinutes: input.targetMinutes,
    };
  }

  const elapsedMinutes = minutesBetween(input.openedAt, input.completedAt);

  return {
    status: elapsedMinutes <= input.targetMinutes ? "MET" : "BREACHED",
    elapsedMinutes,
    targetMinutes: input.targetMinutes,
  };
}

export function evaluateResponseSla(input: {
  openedAt: Date;
  firstResponseAt: Date | null;
  targetMinutes: number;
  now?: Date;
}): SlaMetricEvaluation {
  return evaluateSlaMetric({
    openedAt: input.openedAt,
    completedAt: input.firstResponseAt,
    targetMinutes: input.targetMinutes,
    now: input.now ?? new Date(),
  });
}

export function evaluateResolutionSla(input: {
  openedAt: Date;
  resolvedAt: Date | null;
  targetMinutes: number;
  now?: Date;
}): SlaMetricEvaluation {
  return evaluateSlaMetric({
    openedAt: input.openedAt,
    completedAt: input.resolvedAt,
    targetMinutes: input.targetMinutes,
    now: input.now ?? new Date(),
  });
}

export function buildSlaCounters(evaluations: { response: SlaMetricEvaluation; resolution: SlaMetricEvaluation }[]) {
  const response = { met: 0, breached: 0, pending: 0 };
  const resolution = { met: 0, breached: 0, pending: 0 };

  for (const evaluation of evaluations) {
    if (evaluation.response.status === "MET") response.met += 1;
    else if (evaluation.response.status === "BREACHED") response.breached += 1;
    else response.pending += 1;

    if (evaluation.resolution.status === "MET") resolution.met += 1;
    else if (evaluation.resolution.status === "BREACHED") resolution.breached += 1;
    else resolution.pending += 1;
  }

  return {
    totalTickets: evaluations.length,
    response: {
      ...response,
      complianceRate: complianceRate(response.met, response.breached),
    },
    resolution: {
      ...resolution,
      complianceRate: complianceRate(resolution.met, resolution.breached),
    },
  };
}

export { complianceRate, minutesBetween };
