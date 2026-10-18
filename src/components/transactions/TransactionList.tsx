import { useEffect, useState } from "react";
import { EditTransactionForm } from "@/components/transactions/EditTransactionForm";
import { useFinanceStore } from "@/store/store";
import { formatCentsToDollar } from "@/utils/money";

function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function TransactionList() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const handler = debounce(() => setDebouncedSearch(search), 300);
    handler();
  }, [search]);

  if (!selectedAccountId) {
    return <p>Add account to see your transactions here</p>;
  }

  if (transactions.length === 0) {
    return <p>No transactions logged yet for this account</p>;
  }

  const filtered = transactions.filter((transaction) => {
    if (
      debouncedSearch &&
      !transaction.description.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) {
      return false;
    }
    if (dateFrom && transaction.date < dateFrom) {
      return false;
    }
    if (dateTo && transaction.date > dateTo) {
      return false;
    }
    if (categoryId !== null && transaction.categoryId !== categoryId) {
      return false;
    }
    return true;
  });

  const sortedByDateDescending = [...filtered].sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Transactions</h2>
      <form className="flex flex-wrap gap-4 items-end mb-6" onChange={(event) => event.preventDefault()}>
        <div className="flex flex-col gap-1">
          <label htmlFor="transaction-search" className="text-sm text-muted-foreground">
            Search
          </label>
          <input
            id="transaction-search"
            type="text"
            placeholder="Search descriptions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="transaction-date-from" className="text-sm text-muted-foreground">
            From
          </label>
          <input
            id="transaction-date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="transaction-date-to" className="text-sm text-muted-foreground">
            To
          </label>
          <input
            id="transaction-date-to"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="transaction-filter-category" className="text-sm text-muted-foreground">
            Category
          </label>
          <select
            id="transaction-filter-category"
            value={categoryId ?? ""}
            onChange={(event) =>
              setCategoryId(event.target.value || null)
            }
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
          <option value="">— All categories —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        </div>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className="text-left text-sm text-muted-foreground pb-3">Date</th>
            <th scope="col" className="text-left text-sm text-muted-foreground pb-3">Description</th>
            <th scope="col" className="text-right text-sm text-muted-foreground pb-3">Amount</th>
            <th scope="col" className="text-left text-sm text-muted-foreground pb-3">Actions</th>
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
              <tr key={transaction.id} className="border-t border-border">
                <td className="py-3">{transaction.date}</td>
                <td className="py-3">{transaction.description}</td>
                <td className="py-3 text-right font-mono">
                  {formatCentsToDollar(transaction.amountInCents, {
                    alwaysShowSign: true,
                  })}
                </td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(transaction.id)}
                    className="text-sm text-primary-foreground hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </section>
  );
}
