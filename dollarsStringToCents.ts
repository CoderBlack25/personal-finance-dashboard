export function dollarsStringToCents(dollars: string): number {
  const [wholePart, decimalPart = ""] = dollars.split(".");
  const paddedDecimal = decimalPart.padEnd(2, "0").slice(0, 2);
  return Number(wholePart) * 100 + Number(paddedDecimal);
}
