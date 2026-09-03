import type { ContractStatus } from "@prisma/client";

export type PublicContract = {
  id: string;
  clientId: string;
  code: string;
  title: string;
  description: string | null;
  value: string;
  startDate: string;
  endDate: string | null;
  status: ContractStatus;
  responseMinutes: number;
  resolutionMinutes: number;
};

export type CreateContractInput = {
  clientId: string;
  code: string;
  title: string;
  description?: string | null;
  value: number | string;
  startDate: string;
  endDate?: string | null;
  status?: ContractStatus;
  responseMinutes: number;
  resolutionMinutes: number;
};

export type UpdateContractInput = {
  clientId?: string;
  code?: string;
  title?: string;
  description?: string | null;
  value?: number | string;
  startDate?: string;
  endDate?: string | null;
  status?: ContractStatus;
  responseMinutes?: number;
  resolutionMinutes?: number;
};

export function toPublicContract(contract: {
  id: string;
  clientId: string;
  code: string;
  title: string;
  description: string | null;
  value: { toString(): string };
  startDate: Date;
  endDate: Date | null;
  status: ContractStatus;
  responseMinutes: number;
  resolutionMinutes: number;
}): PublicContract {
  return {
    id: contract.id,
    clientId: contract.clientId,
    code: contract.code,
    title: contract.title,
    description: contract.description,
    value: contract.value.toString(),
    startDate: contract.startDate.toISOString().slice(0, 10),
    endDate: contract.endDate ? contract.endDate.toISOString().slice(0, 10) : null,
    status: contract.status,
    responseMinutes: contract.responseMinutes,
    resolutionMinutes: contract.resolutionMinutes,
  };
}
