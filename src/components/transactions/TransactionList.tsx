import { useEffect, useState } from "react";
import { EditTransactionForm } from "@/components/transactions/EditTransactionForm";
import { useFinanceStore } from "@/store/store";
import { formatCentsToDollar } from "@/utils/money";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, List, Pencil, RotateCcw, XCircle } from "lucide-react";
import { isPostedTransaction } from "@/services/db";

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
  const allTransactions = useFinanceStore((state) => state.allTransactions);
  const categories = useFinanceStore((state) => state.categories);
  const voidTransaction = useFinanceStore((state) => state.voidTransaction);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [showVoided, setShowVoided] = useState(false);

  useEffect(() => {
    const handler = debounce(() => setDebouncedSearch(search), 300);
    handler();
  }, [search]);

  useEffect(() => {
    setShowVoided(false);
    setSearch("");
    setDebouncedSearch("");
    setDateFrom("");
    setDateTo("");
    setCategoryId(null);
    setEditingId(null);
  }, [selectedAccountId]);

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

  const sourceTransactions = showVoided
    ? allTransactions.filter(
        (transaction) => transaction.accountId === selectedAccountId,
      )
    : transactions;

  if (sourceTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <List className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {showVoided
            ? "No transactions found for this account"
            : "No transactions logged yet for this account"}
        </p>
        <p className="text-xs text-muted-foreground">
          {showVoided
            ? "Try disabling 'Show voided' to view active transactions."
            : "Start by adding a transaction above."}
        </p>
      </div>
    );
  }

  const filtered = sourceTransactions.filter((transaction) => {
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
    if (!showVoided && !isPostedTransaction(transaction)) {
      return false;
    }
    return true;
  });

  const sortedByDateDescending = [...filtered].sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  const handleVoid = async (transactionId: string) => {
    await voidTransaction(transactionId, "Voided by user");
  };

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-end lg:gap-6 gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">Transactions</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showVoided ? "default" : "outline"}
            size="sm"
            onClick={() => setShowVoided((prev) => !prev)}
          >
            {showVoided ? "Hide voided" : "Show voided"}
          </Button>
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
                className="text-right text-xs text-muted-foreground pb-3 font-medium pr-4"
              >
                Amount
              </th>
              <th
                scope="col"
                className="text-left text-xs text-muted-foreground pb-3 font-medium pl-4"
              >
                Status
              </th>
              <th
                scope="col"
                className="text-right text-xs text-muted-foreground pb-3 font-medium w-24"
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedByDateDescending.map((transaction) =>
              editingId === transaction.id ? (
                <tr key={transaction.id}>
                  <td colSpan={5} className="py-3">
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
                  <td className="py-3 text-right font-mono tabular-nums text-sm text-foreground pr-4">
                    {formatCentsToDollar(transaction.amountInCents, {
                      alwaysShowSign: true,
                    })}
                  </td>
                  <td className="py-3 text-sm pl-4">
                    {isPostedTransaction(transaction) ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Posted
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        Voided
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(transaction.id)}
                        aria-label={`Edit ${transaction.description}`}
                        title="Edit transaction"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isPostedTransaction(transaction)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVoid(transaction.id)}
                        aria-label={`Void ${transaction.description}`}
                        title={
                          isPostedTransaction(transaction)
                            ? "Void transaction"
                            : "Already voided"
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isPostedTransaction(transaction)}
                      >
                        {isPostedTransaction(transaction) ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </button>
                    </div>
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
