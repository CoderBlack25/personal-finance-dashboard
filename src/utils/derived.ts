import type { Account, Category, Transaction } from "@/types/types";
import { computeBalance } from "./money";
import { isPostedTransaction } from "@/services/db";

function postedTransactions(transactions: Transaction[] = []): Transaction[] {
  return transactions.filter((transaction) => isPostedTransaction(transaction));
}

export interface CategoryRollup {
  categoryId: string | null;
  name: string;
  color: string;
  income: number; // cents
  spending: number; // cents (positive magnitude)
  net: number; // cents
}

export function computeCategoryRollups(
  transactions: Transaction[] = [],
  categories: Category[] = [],
  options: { dateFrom?: string; dateTo?: string; year?: number; month?: number } = {},
): CategoryRollup[] {
  const { dateFrom, dateTo, year, month } = options;
  const rollups = new Map<string | null, CategoryRollup>();
  const visible = postedTransactions(transactions);
  const monthKey = year && month ? `${year}-${String(month).padStart(2, "0")}` : null;

  const ensure = (categoryId: string | null): CategoryRollup => {
    const existing = rollups.get(categoryId);
    if (existing) return existing;
    const category = categories.find((c) => c.id === categoryId);
    const rollup: CategoryRollup = {
      categoryId,
      name: category?.name ?? "Uncategorized",
      color: category?.color ?? "#94a3b8",
      income: 0,
      spending: 0,
      net: 0,
    };
    rollups.set(categoryId, rollup);
    return rollup;
  };

  for (const transaction of visible) {
    if (monthKey && !dateFrom && !dateTo) {
      if (!transaction.date.startsWith(monthKey)) {
        continue;
      }
    }
    if (dateFrom && transaction.date < dateFrom) {
      continue;
    }
    if (dateTo && transaction.date > dateTo) {
      continue;
    }
    const rollup = ensure(transaction.categoryId);
    if (transaction.amountInCents > 0) {
      rollup.income += transaction.amountInCents;
    } else if (transaction.amountInCents < 0) {
      rollup.spending += -transaction.amountInCents;
    }
    rollup.net = rollup.income - rollup.spending;
  }

  return Array.from(rollups.values()).sort((a, b) => b.net - a.net);
}

export interface MonthlySummary {
  income: number; // cents
  spending: number; // cents (positive magnitude)
  net: number; // cents
}

export function computeMonthlySummary(
  transactions: Transaction[] = [],
  year: number,
  month: number, // 1-12
): MonthlySummary {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const visible = postedTransactions(transactions);
  const income = visible
    .filter((t) => t.date.startsWith(monthKey) && t.amountInCents > 0)
    .reduce((sum, t) => sum + t.amountInCents, 0);
  const spending = visible
    .filter((t) => t.date.startsWith(monthKey) && t.amountInCents < 0)
    .reduce((sum, t) => sum + -t.amountInCents, 0);
  return { income, spending, net: income - spending };
}

export interface RunningBalanceEntry {
  transactionId: string;
  date: string;
  amountInCents: number;
  balanceAfter: number;
}

export function computeRunningBalances(
  transactions: Transaction[] = [],
): RunningBalanceEntry[] {
  const visible = postedTransactions(transactions);
  const sorted = [...visible].sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  const entries: RunningBalanceEntry[] = [];
  let balance = 0;
  for (const transaction of sorted) {
    balance += transaction.amountInCents;
    entries.push({
      transactionId: transaction.id,
      date: transaction.date,
      amountInCents: transaction.amountInCents,
      balanceAfter: balance,
    });
  }
  return entries;
}

export interface AccountBalanceRollup {
  accountId: string;
  name: string;
  type: Account["type"];
  balance: number; // cents
}

export function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[] = [],
): AccountBalanceRollup[] {
  const balances = new Map<string, number>();
  for (const account of accounts) {
    balances.set(account.id, 0);
  }
  const visible = postedTransactions(transactions);
  for (const transaction of visible) {
    const current = balances.get(transaction.accountId) ?? 0;
    balances.set(transaction.accountId, current + transaction.amountInCents);
  }

  return accounts.map((account) => ({
    accountId: account.id,
    name: account.name,
    type: account.type,
    balance: balances.get(account.id) ?? 0,
  }));
}

export function computeTotalBalance(transactions: Transaction[] = []): number {
  return computeBalance(postedTransactions(transactions));
}

export function isDuplicateCategoryName(
  name: string,
  existing: Category[] = [],
): boolean {
  const target = name.trim().toLowerCase();
  return existing.some(
    (category) => category.name.trim().toLowerCase() === target,
  );
}

export function filterTransactionsForAccounts(
  transactions: Transaction[] = [],
  accounts: Account[] = [],
): Transaction[] {
  const accountIds = new Set(accounts.map((account) => account.id));
  return postedTransactions(transactions).filter((transaction) =>
    accountIds.has(transaction.accountId),
  );
}

export function countTransactionsByAccount(
  transactions: Transaction[] = [],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const transaction of postedTransactions(transactions)) {
    counts.set(
      transaction.accountId,
      (counts.get(transaction.accountId) ?? 0) + 1,
    );
  }
  return counts;
}

export function getPostedTransactions(
  transactions: Transaction[] = [],
): Transaction[] {
  return postedTransactions(transactions);
}

export function getVoidedTransactions(
  transactions: Transaction[] = [],
): Transaction[] {
  return transactions.filter((transaction) => !isPostedTransaction(transaction));
}
