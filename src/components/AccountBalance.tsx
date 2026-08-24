import { useFinanceStore } from "../../store";
import { computeBalance, formatCents } from "../../money";

export function AccountBalance() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const transactions = useFinanceStore((state) => state.transactions);

  if (!selectedAccountId) {
    return null;
  }

  const balance = computeBalance(transactions);
  return <p className="bg-pink-300">Current balance: {formatCents(balance)}</p>;
}
