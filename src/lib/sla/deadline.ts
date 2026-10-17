export type SlaDeadlineKind = "response" | "resolution";
export type SlaDeadlineTone = "ok" | "warn" | "breached";

export type SlaDeadline = {
  kind: SlaDeadlineKind;
  targetMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  tone: SlaDeadlineTone;
};

const MS_PER_MINUTE = 60_000;
const WARN_RATIO = 0.1;

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_MINUTE);
}

function toneForRemaining(remainingMinutes: number, targetMinutes: number): SlaDeadlineTone {
  if (remainingMinutes <= 0) {
    return "breached";
  }

  if (targetMinutes > 0 && remainingMinutes / targetMinutes <= WARN_RATIO) {
    return "warn";
  }

  return "ok";
}

/** Prazo ativo do chamado: resposta enquanto não houve 1ª resposta; depois resolução. */
export function getActiveSlaDeadline(input: {
  openedAt: Date | string;
  firstResponseAt: Date | string | null;
  resolvedAt: Date | string | null;
  status: string;
  responseMinutes: number;
  resolutionMinutes: number;
  now?: Date;
}): SlaDeadline | null {
  if (input.status === "RESOLVED" || input.status === "CLOSED" || input.resolvedAt) {
    return null;
  }

  const now = input.now ?? new Date();
  const openedAt = input.openedAt instanceof Date ? input.openedAt : new Date(input.openedAt);
  const firstResponseAt = input.firstResponseAt
    ? input.firstResponseAt instanceof Date
      ? input.firstResponseAt
      : new Date(input.firstResponseAt)
    : null;

  const kind: SlaDeadlineKind = firstResponseAt ? "resolution" : "response";
  const targetMinutes = kind === "response" ? input.responseMinutes : input.resolutionMinutes;

  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) {
    return null;
  }

  const elapsedMinutes = Math.max(0, minutesBetween(openedAt, now));
  const remainingMinutes = targetMinutes - elapsedMinutes;

  return {
    kind,
    targetMinutes,
    elapsedMinutes,
    remainingMinutes,
    tone: toneForRemaining(remainingMinutes, targetMinutes),
  };
}

export function formatSlaDeadlineLabel(deadline: SlaDeadline): string {
  const kindLabel = deadline.kind === "response" ? "resposta" : "resolução";

  if (deadline.remainingMinutes <= 0) {
    const late = Math.abs(deadline.remainingMinutes);
    if (late === 0) {
      return `SLA de ${kindLabel} estourado`;
    }
    return `SLA de ${kindLabel} estourado há ${formatSlaDuration(late)}`;
  }

  return `SLA de ${kindLabel}: restam ${formatSlaDuration(deadline.remainingMinutes)}`;
}

export function formatSlaDuration(minutes: number): string {
  const absolute = Math.max(0, Math.round(minutes));

  if (absolute < 60) {
    return `${absolute} min`;
  }

  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
