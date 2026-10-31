import type { Prisma } from "@prisma/client";

/**
 * Valor Decimal de teste: só o toString() é usado pelo código (mesma saída do texto informado),
 * com o tipo do Prisma para os mocks tipados compilarem.
 */
export function decimal(value: string): Prisma.Decimal {
  return { toString: () => value } as unknown as Prisma.Decimal;
}
