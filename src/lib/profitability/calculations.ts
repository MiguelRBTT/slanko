function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toNumeric(value: { toString(): string } | number | string): number {
  return typeof value === "number" ? value : Number(value.toString());
}

export function formatMoney(value: number): string {
  return roundMoney(value).toFixed(2);
}

export function calculateEntryCost(hours: number, hourlyCost: number): number {
  return roundMoney(hours * hourlyCost);
}

export function calculateContractProfitability(input: {
  contractValue: number;
  totalHours: number;
  totalCost: number;
}) {
  const margin = roundMoney(input.contractValue - input.totalCost);
  const marginRate =
    input.contractValue > 0 ? roundMoney((margin / input.contractValue) * 100) : null;

  return {
    contractValue: formatMoney(input.contractValue),
    totalHours: formatMoney(input.totalHours),
    totalCost: formatMoney(input.totalCost),
    margin: formatMoney(margin),
    marginRate,
    deficitary: margin < 0,
  };
}

export function buildProfitabilityTotals(
  contracts: Array<{
    contractValue: string;
    totalHours: string;
    totalCost: string;
    margin: string;
    deficitary: boolean;
  }>,
) {
  let totalContractValue = 0;
  let totalHours = 0;
  let totalCost = 0;
  let totalMargin = 0;
  let deficitaryContracts = 0;

  for (const contract of contracts) {
    totalContractValue += toNumeric(contract.contractValue);
    totalHours += toNumeric(contract.totalHours);
    totalCost += toNumeric(contract.totalCost);
    totalMargin += toNumeric(contract.margin);

    if (contract.deficitary) {
      deficitaryContracts += 1;
    }
  }

  return {
    totalContracts: contracts.length,
    deficitaryContracts,
    totalContractValue: formatMoney(totalContractValue),
    totalHours: formatMoney(totalHours),
    totalCost: formatMoney(totalCost),
    totalMargin: formatMoney(totalMargin),
  };
}
