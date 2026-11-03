import { useFinanceStore } from "@/store/store";
import { useAllTransactions } from "@/hooks/useFinanceData";
import {
  computeBalance,
  formatAccessibleMoney,
  formatCentsToDollar,
} from "@/utils/money";

export function AccountBalance() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const { data: allTransactions, error } = useAllTransactions();

  if (!selectedAccountId) {
    return null;
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  }

  const accountTransactions = allTransactions.filter(
    (transaction) => transaction.accountId === selectedAccountId,
  );
  const balance = computeBalance(accountTransactions);
  const isPositive = balance >= 0;

  return (
    <p className="text-lg font-medium font-mono tabular-nums text-foreground">
      Current balance:{" "}
      <output
        className={isPositive ? "text-success-foreground" : "text-destructive"}
        aria-label={`Current balance: ${formatAccessibleMoney(balance)}`}
      >
        {formatCentsToDollar(balance)}
      </output>
    </p>
  );
}
