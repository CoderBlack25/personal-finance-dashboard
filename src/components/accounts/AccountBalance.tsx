import { useFinanceStore } from "@/store/store";
import { computeBalance, formatCentsToDollar } from "@/utils/money";

export function AccountBalance() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const transactions = useFinanceStore((state) => state.transactions);

  if (!selectedAccountId) {
    return null;
  }

  const balance = computeBalance(transactions);
  const isPositive = balance >= 0;

  return (
    <p className="text-lg font-medium font-mono tabular-nums text-foreground">
      Current balance:{" "}
      <span
        className={isPositive ? "text-success-foreground" : "text-destructive"}
      >
        {formatCentsToDollar(balance)}
      </span>
    </p>
  );
}
