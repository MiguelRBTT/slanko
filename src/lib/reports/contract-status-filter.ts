import type { ContractStatus } from "@prisma/client";
import { BadRequestError } from "@/lib/errors/app-error";

/** Contratos que já tiveram vigência entram nos relatórios; rascunhos ficam de fora. */
export const REPORTABLE_CONTRACT_STATUSES: ContractStatus[] = ["ACTIVE", "SUSPENDED", "FINISHED"];

/**
 * Filtro `status` dos relatórios de SLA e rentabilidade:
 * ausente ou ACTIVE → só ativos (padrão do painel); SUSPENDED/FINISHED → só essa situação;
 * ALL → ativos, suspensos e finalizados.
 */
export function parseContractStatusFilter(searchParams: URLSearchParams): ContractStatus[] {
  const raw = searchParams.get("status");

  if (!raw || raw === "ACTIVE") {
    return ["ACTIVE"];
  }

  if (raw === "ALL") {
    return REPORTABLE_CONTRACT_STATUSES;
  }

  if (raw === "SUSPENDED" || raw === "FINISHED") {
    return [raw];
  }

  throw new BadRequestError("status filter is invalid");
}
