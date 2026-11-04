import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EditTransactionForm } from "@/components/transactions/EditTransactionForm";
import { useFinanceStore } from "@/store/store";
import {
  useAccounts,
  useAllTransactions,
  useCategories,
} from "@/hooks/useFinanceData";
import {
  formatAccessibleMoney,
  formatCentsToDollar,
} from "@/utils/money";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, List, Pencil, Trash2 } from "lucide-react";
import type { Transaction } from "@/types/types";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  compareTransactionChronologically,
  computeRunningBalances,
} from "@/utils/derived";

const ALL_ACCOUNTS = "";
const VIRTUALIZATION_THRESHOLD = 300;
const VIRTUALIZATION_OVERSCAN = 8;
const VIRTUALIZED_LIST_HEIGHT = 600;
const ESTIMATED_ROW_HEIGHT = 56;

export function TransactionList() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const { data: accountData, error: accountsError } = useAccounts();
  const { data: allTransactions, error: transactionsError } =
    useAllTransactions();
  const { data: categories, error: categoriesError } = useCategories();
  const { accounts } = accountData;
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const transactionFilters = useFinanceStore(
    (state) => state.transactionFilters,
  );
  const updateTransactionFilters = useFinanceStore(
    (state) => state.updateTransactionFilters,
  );
  const resetTransactionFilters = useFinanceStore(
    (state) => state.resetTransactionFilters,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const transactionListRef = useRef<HTMLDivElement>(null);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const {
    searchQuery,
    dateFrom,
    dateTo,
    accountId: accountFilterId,
    categoryId,
  } = transactionFilters;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    resetTransactionFilters(selectedAccountId);
    setEditingId(null);
  }, [selectedAccountId, resetTransactionFilters]);

  const accountScopedTransactions = allTransactions.filter(
    (transaction) =>
      accountFilterId === ALL_ACCOUNTS ||
      transaction.accountId === accountFilterId,
  );
  const transactionsByAccount = new Map<string, typeof allTransactions>();
  for (const transaction of allTransactions) {
    const accountTransactions =
      transactionsByAccount.get(transaction.accountId) ?? [];
    accountTransactions.push(transaction);
    transactionsByAccount.set(transaction.accountId, accountTransactions);
  }
  const runningBalanceMap = new Map<string, number>();
  for (const accountTransactions of transactionsByAccount.values()) {
    for (const entry of computeRunningBalances(accountTransactions)) {
      runningBalanceMap.set(entry.transactionId, entry.balanceAfter);
    }
  }

  const filtered = accountScopedTransactions.filter((transaction) => {
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

  const sortedByDateDescending = [...filtered].sort((a, b) =>
    compareTransactionChronologically(b, a),
  );
  const isVirtualized =
    sortedByDateDescending.length > VIRTUALIZATION_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: isVirtualized ? sortedByDateDescending.length : 0,
    getScrollElement: () => transactionListRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => sortedByDateDescending[index].id,
    overscan: VIRTUALIZATION_OVERSCAN,
    initialRect: { width: 800, height: VIRTUALIZED_LIST_HEIGHT },
  });
  const virtualRows = virtualizer.getVirtualItems();
  const fallbackStartIndex = Math.max(
    0,
    Math.floor(
      (transactionListRef.current?.scrollTop ?? 0) / ESTIMATED_ROW_HEIGHT,
    ) - VIRTUALIZATION_OVERSCAN,
  );
  const fallbackEndIndex = Math.min(
    sortedByDateDescending.length,
    Math.ceil(
      ((transactionListRef.current?.scrollTop ?? 0) +
        Math.max(
          transactionListRef.current?.clientHeight ?? 0,
          VIRTUALIZED_LIST_HEIGHT,
        )) /
        ESTIMATED_ROW_HEIGHT,
    ) + VIRTUALIZATION_OVERSCAN,
  );
  const renderedRows = isVirtualized
    ? virtualRows.length > 0
      ? virtualRows
      : Array.from(
          { length: fallbackEndIndex - fallbackStartIndex },
          (_, offset) => {
            const index = fallbackStartIndex + offset;
            return {
              index,
              key: sortedByDateDescending[index].id,
              start: index * ESTIMATED_ROW_HEIGHT,
              end: (index + 1) * ESTIMATED_ROW_HEIGHT,
            };
          },
        )
    : sortedByDateDescending.map((transaction, index) => ({
        index,
        key: transaction.id,
        start: 0,
        end: 0,
      }));

  useEffect(() => {
    if (isVirtualized && transactionListRef.current) {
      transactionListRef.current.scrollTop = 0;
      virtualizer.measure();
    }
  }, [
    accountFilterId,
    allTransactions,
    categoryId,
    dateFrom,
    dateTo,
    debouncedSearch,
    isVirtualized,
    virtualizer,
  ]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const error = await deleteTransaction(pendingDelete.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    setPendingDelete(null);
  };

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
          <div className="flex flex-col gap-1 min-w-40">
            <label
              htmlFor="transaction-filter-account"
              className="text-xs font-medium text-muted-foreground"
            >
              Account
            </label>
            <Select
              id="transaction-filter-account"
              value={accountFilterId}
              onChange={(event) => {
                updateTransactionFilters({ accountId: event.target.value });
                setEditingId(null);
              }}
            >
              <option value={ALL_ACCOUNTS}>All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
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
                value={searchQuery}
                onChange={(event) =>
                  updateTransactionFilters({ searchQuery: event.target.value })
                }
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
              onChange={(event) =>
                updateTransactionFilters({ dateFrom: event.target.value })
              }
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
              onChange={(event) =>
                updateTransactionFilters({ dateTo: event.target.value })
              }
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
              onChange={(event) =>
                updateTransactionFilters({
                  categoryId: event.target.value || null,
                })
              }
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

      {(accountsError || transactionsError || categoriesError) && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {accountsError ?? transactionsError ?? categoriesError}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <List className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No transactions found for this filter
          </p>
          <p className="text-xs text-muted-foreground">
            Try changing the filters or add a transaction.
          </p>
        </div>
      ) : (
        <div
          ref={transactionListRef}
          className={isVirtualized ? "overflow-auto" : "overflow-x-auto"}
          style={isVirtualized ? { maxHeight: VIRTUALIZED_LIST_HEIGHT } : undefined}
          aria-label={
            isVirtualized
              ? `Transactions list, ${sortedByDateDescending.length} transactions`
              : undefined
          }
        >
          <table className="w-full text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className={`text-left text-xs text-muted-foreground pb-3 font-medium${isVirtualized ? " sticky top-0 z-10 bg-card" : ""}`}
              >
                Date
              </th>
              <th
                scope="col"
                className={`text-left text-xs text-muted-foreground pb-3 font-medium${isVirtualized ? " sticky top-0 z-10 bg-card" : ""}`}
              >
                Description
              </th>
              <th
                scope="col"
                className={`text-right text-xs text-muted-foreground pb-3 font-medium pr-4${isVirtualized ? " sticky top-0 z-10 bg-card" : ""}`}
              >
                Amount
              </th>
              <th
                scope="col"
                className={`text-right text-xs text-muted-foreground pb-3 font-medium pr-4${isVirtualized ? " sticky top-0 z-10 bg-card" : ""}`}
              >
                Running Balance
              </th>
              <th
                scope="col"
                className={`text-right text-xs text-muted-foreground pb-3 font-medium w-24${isVirtualized ? " sticky top-0 z-10 bg-card" : ""}`}
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isVirtualized && renderedRows.length > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={5}
                  style={{
                    height: renderedRows[0].start,
                    padding: 0,
                    border: 0,
                  }}
                />
              </tr>
            )}
            {renderedRows.map((row) => {
              const transaction = sortedByDateDescending[row.index];
              return editingId === transaction.id ? (
                <tr
                  key={transaction.id}
                  ref={isVirtualized ? virtualizer.measureElement : undefined}
                  data-index={row.index}
                >
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
                  ref={isVirtualized ? virtualizer.measureElement : undefined}
                  data-index={row.index}
                  className="border-t border-border hover:bg-accent/50 transition-colors"
                >
                  <td className="py-3 text-sm text-foreground">
                    {transaction.date}
                  </td>
                  <td className="py-3 text-sm text-foreground">
                    {transaction.description}
                  </td>
                  <td
                    className="py-3 text-right font-mono tabular-nums text-sm text-foreground pr-4"
                    aria-label={formatAccessibleMoney(
                      transaction.amountInCents,
                    )}
                  >
                    {formatCentsToDollar(transaction.amountInCents, {
                      alwaysShowSign: true,
                    })}
                  </td>
                  <td
                    className="py-3 text-right font-mono tabular-nums text-sm text-muted-foreground pr-4"
                    aria-label={
                      runningBalanceMap.has(transaction.id)
                        ? formatAccessibleMoney(
                            runningBalanceMap.get(transaction.id)!,
                          )
                        : undefined
                    }
                  >
                    {runningBalanceMap.has(transaction.id)
                      ? formatCentsToDollar(
                          runningBalanceMap.get(transaction.id)!,
                          { alwaysShowSign: true },
                        )
                      : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(transaction.id)}
                        aria-label={`Edit ${transaction.description}`}
                        title="Edit transaction"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setPendingDelete(transaction);
                        }}
                        aria-label={`Delete ${transaction.description}`}
                        title="Delete transaction"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {isVirtualized && renderedRows.length > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={5}
                  style={{
                    height:
                      virtualizer.getTotalSize() -
                      renderedRows[renderedRows.length - 1].end,
                    padding: 0,
                    border: 0,
                  }}
                />
              </tr>
            )}
          </tbody>
          </table>
        </div>
      )}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogContent>
            <DialogTitle>Delete transaction?</DialogTitle>
            <DialogDescription>
              This permanently deletes
              {pendingDelete ? ` “${pendingDelete.description}”` : " this transaction"}.
              This cannot be undone.
            </DialogDescription>
            {deleteError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </section>
  );
}
