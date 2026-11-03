import { useFinanceStore } from "@/store/store";
import { useAllTransactions } from "@/hooks/useFinanceData";
import { computeBalance, formatCentsToDollar } from "@/utils/money";
import { isPostedTransaction } from "@/services/db";

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
    (transaction) =>
      transaction.accountId === selectedAccountId &&
      isPostedTransaction(transaction),
  );
  const balance = computeBalance(accountTransactions);
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
