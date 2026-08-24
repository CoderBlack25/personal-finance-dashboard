function splitAbsoluteCents(absCents: number): {
  dollars: number;
  cents: number;
} {
  return { dollars: Math.floor(absCents / 100), cents: absCents % 100 };
}

export function dollarsStringToCents(dollars: string): number {
  const [wholePart, decimalPart = ""] = dollars.split(".");
  const paddedDecimal = decimalPart.padEnd(2, "0").slice(0, 2);
  return Number(wholePart) * 100 + Number(paddedDecimal);
}

export function formatCents(
  amountInCents: number,
  options: { alwaysShowSign?: boolean } = {},
): string {
  const isNegative = amountInCents < 0;
  const { dollars, cents } = splitAbsoluteCents(Math.abs(amountInCents));
  const sign = isNegative ? "-" : options.alwaysShowSign ? "+" : "";
  return `${sign}$${dollars.toLocaleString()}.${String(cents).padStart(2, "0")}`;
}

export function computeBalance(
  transactions: { amountInCents: number }[],
): number {
  return transactions.reduce(
    (total, transaction) => total + transaction.amountInCents,
    0,
  );
}
