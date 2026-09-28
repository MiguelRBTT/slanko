/** Rótulos em português para enums da API. */

export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando",
  RESOLVED: "Resolvido",
  CLOSED: "Encerrado",
};

export const TICKET_PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  FINISHED: "Finalizado",
};

export const SLA_CHECK_LABEL: Record<string, string> = {
  MET: "Cumprido",
  BREACHED: "Violado",
  PENDING: "Pendente",
  OK: "Cumprido",
};

export function labelTicketStatus(status: string): string {
  return TICKET_STATUS_LABEL[status] ?? status;
}

export function labelTicketPriority(priority: string): string {
  return TICKET_PRIORITY_LABEL[priority] ?? priority;
}

export function labelContractStatus(status: string): string {
  return CONTRACT_STATUS_LABEL[status] ?? status;
}

export function labelSlaCheck(status: string): string {
  return SLA_CHECK_LABEL[status] ?? status;
}

export function ticketStatusBadgeClass(status: string): string {
  if (status === "RESOLVED" || status === "CLOSED") {
    return "badge badge-ok";
  }

  if (status === "WAITING") {
    return "badge badge-warn";
  }

  if (status === "IN_PROGRESS") {
    return "badge badge-warn";
  }

  return "badge badge-neutral";
}

export function ticketPriorityBadgeClass(priority: string): string {
  if (priority === "CRITICAL" || priority === "HIGH") {
    return "badge badge-danger";
  }

  if (priority === "MEDIUM") {
    return "badge badge-warn";
  }

  return "badge badge-neutral";
}

export function contractStatusBadgeClass(status: string): string {
  if (status === "ACTIVE") {
    return "badge badge-ok";
  }

  if (status === "SUSPENDED") {
    return "badge badge-warn";
  }

  if (status === "FINISHED") {
    return "badge badge-neutral";
  }

  return "badge badge-neutral";
}

export function slaCheckBadgeClass(status: string): string {
  if (status === "BREACHED") {
    return "badge badge-danger";
  }

  if (status === "MET" || status === "OK") {
    return "badge badge-ok";
  }

  return "badge badge-neutral";
}
