import { useFinanceStore } from "@/store/store";
import { computeBalance, formatCentsToDollar } from "@/utils/money";
import { isPostedTransaction } from "@/services/db";

export function AccountBalance() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const allTransactions = useFinanceStore((state) => state.allTransactions);

  if (!selectedAccountId) {
    return null;
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
