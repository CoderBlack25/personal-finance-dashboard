import { useEffect, useState } from "react";
import { EditTransactionForm } from "@/components/transactions/EditTransactionForm";
import { useFinanceStore } from "@/store/store";
import { formatCentsToDollar } from "@/utils/money";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search, List, Pencil } from "lucide-react";

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
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No account selected.</p>
        <p className="text-xs text-muted-foreground">
          Select an account from the sidebar to view transactions.
        </p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <List className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No transactions logged yet for this account
        </p>
        <p className="text-xs text-muted-foreground">
          Start by adding a transaction above.
        </p>
      </div>
    );
  }

  const filtered = transactions.filter((transaction) => {
    if (
      debouncedSearch &&
      !transaction.description
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase())
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
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-end lg:gap-6 gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">Transactions</h2>
        </div>

        <form
          className="flex flex-wrap gap-3 items-end"
          onChange={(event) => event.preventDefault()}
        >
          <div className="flex flex-col gap-1 min-w-50">
            <label
              htmlFor="transaction-search"
              className="text-xs font-medium text-muted-foreground"
            >
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="transaction-search"
                type="text"
                placeholder="Search descriptions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="transaction-date-from"
              className="text-xs font-medium text-muted-foreground"
            >
              From
            </label>
            <Input
              id="transaction-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="transaction-date-to"
              className="text-xs font-medium text-muted-foreground"
            >
              To
            </label>
            <Input
              id="transaction-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="transaction-filter-category"
              className="text-xs font-medium text-muted-foreground"
            >
              Category
            </label>
            <Select
              id="transaction-filter-category"
              value={categoryId ?? ""}
              onChange={(event) => setCategoryId(event.target.value || null)}
            >
              <option value="">— All categories —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left text-xs text-muted-foreground pb-3 font-medium"
              >
                Date
              </th>
              <th
                scope="col"
                className="text-left text-xs text-muted-foreground pb-3 font-medium"
              >
                Description
              </th>
              <th
                scope="col"
                className="text-right text-xs text-muted-foreground pb-3 font-medium"
              >
                Amount
              </th>
              <th
                scope="col"
                className="text-right text-xs text-muted-foreground pb-3 font-medium w-12"
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedByDateDescending.map((transaction) =>
              editingId === transaction.id ? (
                <tr key={transaction.id}>
                  <td colSpan={4} className="py-3">
                    <EditTransactionForm
                      transaction={transaction}
                      onDone={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr
                  key={transaction.id}
                  className="border-t border-border hover:bg-accent/50 transition-colors"
                >
                  <td className="py-3 text-sm text-foreground">
                    {transaction.date}
                  </td>
                  <td className="py-3 text-sm text-foreground">
                    {transaction.description}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums text-sm text-foreground">
                    {formatCentsToDollar(transaction.amountInCents, {
                      alwaysShowSign: true,
                    })}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingId(transaction.id)}
                      aria-label={`Edit ${transaction.description}`}
                      title="Edit transaction"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
