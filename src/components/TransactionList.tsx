import { useFinanceStore } from "../../store";
import { formatCents } from "../../money";

export function TransactionList() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const transactions = useFinanceStore((state) => state.transactions);

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
      <caption>Transactions</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Description</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      <tbody>
        {sortedByDateDescending.map((transaction) => (
          <tr key={transaction.id}>
            <td>{transaction.date}</td>
            <td>{transaction.description}</td>
            <td>
              {formatCents(transaction.amountInCents, { alwaysShowSign: true })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
