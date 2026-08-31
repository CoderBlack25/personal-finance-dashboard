import { useState } from "react";
import { EditTransactionForm } from "./EditTransactionForm";
import { useFinanceStore } from "../../store";
import { formatCentsToDollar } from "../../money";

export function TransactionList() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const transactions = useFinanceStore((state) => state.transactions);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!selectedAccountId) {
    return <p>Add account to see your transactions here</p>;
  }

  if (transactions.length === 0) {
    return <p>No transactions logged yet for this account</p>;
  }

  const sortedByDateDescending = [...transactions].sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    }

    if (a.date > b.date) {
      return -1;
    }

    return 0;
  });

  return (
    <table className="bg-green-700">
      <caption className="text-white">Transactions</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Description</th>
          <th scope="col">Amount</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedByDateDescending.map((transaction) =>
          editingId === transaction.id ? (
            <tr key={transaction.id}>
              <td colSpan={4}>
                <EditTransactionForm
                  transaction={transaction}
                  onDone={() => setEditingId(null)}
                />
              </td>
            </tr>
          ) : (
            <tr key={transaction.id}>
              <td>{transaction.date}</td>
              <td>{transaction.description}</td>
              <td>
                {formatCentsToDollar(transaction.amountInCents, {
                  alwaysShowSign: true,
                })}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => setEditingId(transaction.id)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
