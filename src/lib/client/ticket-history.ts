import type { PublicTicketEvent } from "@/types/ticket-event";
import { formatWorkedMinutes } from "@/lib/client/format";
import { labelTicketPriority, labelTicketStatus } from "@/lib/client/labels";

/** Descrição em português de cada evento do histórico do chamado (RF07). */

type JsonRecord = Record<string, unknown>;

const FIELD_LABEL: Record<string, string> = {
  title: "título",
  description: "descrição",
  priority: "prioridade",
  category: "categoria",
  solution: "solução",
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function assigneeName(value: unknown): string {
  const ref = asRecord(value);
  return typeof ref.name === "string" && ref.name ? ref.name : "sem responsável";
}

function describeFieldChange(field: string, change: JsonRecord): string {
  const label = FIELD_LABEL[field] ?? field;

  if (field === "priority") {
    return `${label}: ${labelTicketPriority(String(change.from))} → ${labelTicketPriority(String(change.to))}`;
  }

  if (field === "description" || field === "solution") {
    return change.from ? `${label} alterada` : `${label} registrada`;
  }

  return `${label}: "${String(change.from ?? "")}" → "${String(change.to ?? "")}"`;
}

export function describeTicketEvent(
  event: Pick<PublicTicketEvent, "type" | "data">,
  userName: (id: string) => string = () => "usuário",
): string {
  const data = asRecord(event.data);

  switch (event.type) {
    case "CREATED":
      return data.assignedTo
        ? `Abriu o chamado e atribuiu a ${assigneeName(data.assignedTo)}`
        : "Abriu o chamado";
    case "STATUS_CHANGED":
      return `Mudou a situação: ${labelTicketStatus(String(data.from))} → ${labelTicketStatus(String(data.to))}`;
    case "ASSIGNEE_CHANGED":
      return `Mudou o responsável: ${assigneeName(data.from)} → ${assigneeName(data.to)}`;
    case "OBSERVERS_CHANGED": {
      const parts: string[] = [];
      const added = asStringList(data.added).map(userName);
      const removed = asStringList(data.removed).map(userName);
      if (added.length > 0) parts.push(`adicionou ${added.join(", ")}`);
      if (removed.length > 0) parts.push(`removeu ${removed.join(", ")}`);
      return `Observadores: ${parts.join("; ") || "sem mudança"}`;
    }
    case "UPDATED": {
      const fields = asRecord(data.fields);
      const changes = Object.entries(fields).map(([field, change]) => describeFieldChange(field, asRecord(change)));
      return `Corrigiu ${changes.join("; ")}`;
    }
    case "TIME_LOGGED":
      return `Apontou ${formatWorkedMinutes(String(data.hours ?? 0))}`;
    case "TIME_UPDATED": {
      const from = asRecord(data.from);
      const to = asRecord(data.to);
      return `Corrigiu um apontamento: ${formatWorkedMinutes(String(from.hours ?? 0))} → ${formatWorkedMinutes(String(to.hours ?? 0))}`;
    }
    case "TIME_DELETED":
      return `Excluiu um apontamento de ${formatWorkedMinutes(String(data.hours ?? 0))}`;
    case "ATTACHMENT_ADDED":
      return `Anexou ${String(data.fileName ?? "arquivo")}`;
    case "ATTACHMENT_REMOVED":
      return `Removeu o anexo ${String(data.fileName ?? "arquivo")}`;
    default:
      return "Alteração registrada";
  }
}

export function formatEventDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
