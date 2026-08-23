export function formatCents(amountInCents: number): string {
  const isNegative = amountInCents < 0;
  const absCents = Math.abs(amountInCents);
  const dollars = Math.floor(absCents / 100);
  const remainderCents = absCents % 100;
  const sign = isNegative ? "-" : "+";
  return `${sign}$${dollars.toLocaleString()}.${String(remainderCents).padStart(2, "0")}`;
}
