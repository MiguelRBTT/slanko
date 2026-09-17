import type { ContractStatus } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { BadRequestError } from "@/lib/errors/app-error";
import { assertGestor } from "@/lib/auth/require-gestor";
import { contractService } from "@/services/contract.service";
import type { CreateContractInput } from "@/types/contract";

const CONTRACT_STATUSES: ContractStatus[] = ["DRAFT", "ACTIVE", "SUSPENDED", "FINISHED"];

function parseStatusFilter(value: string | null): ContractStatus | undefined {
  if (!value) {
    return undefined;
  }

  if (!CONTRACT_STATUSES.includes(value as ContractStatus)) {
    throw new BadRequestError("status filter is invalid");
  }

  return value as ContractStatus;
}

// GET /api/contracts - list contracts (JWT; gestor or tecnico).
// POST /api/contracts - create contract (gestor only).

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const status = parseStatusFilter(searchParams.get("status"));

    const contracts = await contractService.listContracts({ clientId, status });

    return jsonOk({ contracts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertGestor(request);
    const body = (await request.json()) as CreateContractInput;
    const contract = await contractService.createContract(body);

    return jsonOk({ contract }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
