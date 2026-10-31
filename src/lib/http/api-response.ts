import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { recordApiError } from "@/lib/observability/metrics";

function prismaErrorCode(error: unknown): string | null {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
}

// Shared helpers for consistent JSON responses across API routes.

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown) {
  const response = errorResponse(error);
  recordApiError(response.status);
  return response;
}

function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  // Erros conhecidos do Prisma que dependem da entrada, não de falha do servidor.
  const code = prismaErrorCode(error);

  if (code === "P2025") {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  if (code === "P2003") {
    return NextResponse.json({ error: "Related resource not found" }, { status: 400 });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
