import { useFinanceStore } from "@/store/store";
import { computeBalance, formatCentsToDollar } from "@/utils/money";

export function AccountBalance() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const transactions = useFinanceStore((state) => state.transactions);

  if (!selectedAccountId) {
    return null;
  }

  const balance = computeBalance(transactions);
  return (
    <p className="text-lg font-medium">
      Current balance: {formatCentsToDollar(balance)}
    </p>
  );
}
