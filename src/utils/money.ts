export function splitAbsoluteCents(absCents: number): {
  dollars: number;
  cents: number;
} {
  return { dollars: Math.floor(absCents / 100), cents: absCents % 100 };
}

export function dollarsStringToCents(dollars: string): number {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(dollars.trim());
  if (!match) {
    throw new Error("Amount must be a decimal number.");
  }

  const [, sign, wholePart, decimalPart = ""] = match;
  const centsPart = decimalPart.slice(0, 2).padEnd(2, "0");
  let cents = BigInt(wholePart) * 100n + BigInt(centsPart);
  if (decimalPart.length > 2 && decimalPart[2] >= "5") {
    cents += 1n;
  }
  if (sign === "-") {
    cents = -cents;
  }

  if (
    cents > BigInt(Number.MAX_SAFE_INTEGER) ||
    cents < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RangeError("Amount exceeds the supported range.");
  }
  return Number(cents);
}

export function formatCentsToDollar(
  amountInCents: number,
  options: { alwaysShowSign?: boolean } = {},
): string {
  const isNegative = amountInCents < 0;
  const { dollars, cents } = splitAbsoluteCents(Math.abs(amountInCents));
  const sign = isNegative ? "-" : options.alwaysShowSign ? "+" : "";
  return `${sign}$${dollars.toLocaleString()}.${String(cents).padStart(2, "0")}`;
}

export function formatAccessibleMoney(amountInCents: number): string {
  const { dollars, cents } = splitAbsoluteCents(Math.abs(amountInCents));
  const dollarLabel = `${dollars.toLocaleString()} ${
    dollars === 1 ? "dollar" : "dollars"
  }`;
  const centLabel = `${cents} ${cents === 1 ? "cent" : "cents"}`;
  const amountLabel = `${dollarLabel} and ${centLabel} USD`;

  if (amountInCents > 0) {
    return `Positive ${amountLabel}`;
  }
  if (amountInCents < 0) {
    return `Negative ${amountLabel}`;
  }
  return `Zero ${amountLabel}`;
}

export function computeBalance(
  transactions: { amountInCents: number }[],
): number {
  return transactions.reduce(
    (total, transaction) => total + transaction.amountInCents,
    0,
  );
}
