import { describe, expect, it } from "vitest";
import type { Account, Category, Transaction } from "@/types/types";
import {
  computeAccountBalances,
  computeCategoryRollups,
  computeMonthlySummary,
  computeRunningBalances,
  computeTotalBalance,
  countTransactionsByAccount,
  filterTransactionsForAccounts,
  isDuplicateCategoryName,
} from "@/utils/derived";

const account = (overrides: Partial<Account> = {}): Account => ({
  id: "acc-1",
  name: "Checking",
  type: "checking",
  archived: false,
  ...overrides,
});

const category = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-1",
  name: "Groceries",
  color: "#22c55e",
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "tx-1",
  accountId: "acc-1",
  categoryId: "cat-1",
  amountInCents: -5000,
  date: "2026-08-28",
  description: "Groceries",
  ...overrides,
});

describe("computeCategoryRollups", () => {
  it("returns an empty list when there are no transactions", () => {
    expect(computeCategoryRollups([], [])).toEqual([]);
  });

  it("rolls up income and spending per category", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", amountInCents: -5000 }),
      transaction({ id: "tx-2", amountInCents: -3000 }),
      transaction({
        id: "tx-3",
        categoryId: "cat-2",
        amountInCents: 120000,
      }),
    ];
    const categories: Category[] = [
      category({ id: "cat-1", name: "Groceries" }),
      category({ id: "cat-2", name: "Income", color: "#14b8a6" }),
    ];

    const rollups = computeCategoryRollups(transactions, categories);

    expect(rollups).toEqual([
      {
        categoryId: "cat-2",
        name: "Income",
        color: "#14b8a6",
        income: 120000,
        spending: 0,
        net: 120000,
      },
      {
        categoryId: "cat-1",
        name: "Groceries",
        color: "#22c55e",
        income: 0,
        spending: 8000,
        net: -8000,
      },
    ]);
  });

  it("groups uncategorized transactions under Uncategorized", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", categoryId: null, amountInCents: -1000 }),
    ];

    const rollups = computeCategoryRollups(transactions, []);

    expect(rollups).toEqual([
      {
        categoryId: null,
        name: "Uncategorized",
        color: "#94a3b8",
        income: 0,
        spending: 1000,
        net: -1000,
      },
    ]);
  });

  it("handles negative balances", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", amountInCents: -10000 }),
      transaction({ id: "tx-2", amountInCents: 2000 }),
    ];

    const rollups = computeCategoryRollups(transactions, []);

    expect(rollups[0].net).toBe(-8000);
    expect(rollups[0].spending).toBe(10000);
  });
});

describe("computeMonthlySummary", () => {
  it("returns zeros when there are no transactions", () => {
    expect(computeMonthlySummary([], 2026, 8)).toEqual({
      income: 0,
      spending: 0,
      net: 0,
    });
  });

  it("summarizes income, spending, and net for a month", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", amountInCents: -5000, date: "2026-08-05" }),
      transaction({ id: "tx-2", amountInCents: 120000, date: "2026-08-10" }),
      transaction({
        id: "tx-3",
        amountInCents: -2000,
        date: "2026-09-01",
      }),
    ];

    const summary = computeMonthlySummary(transactions, 2026, 8);

    expect(summary).toEqual({ income: 120000, spending: 5000, net: 115000 });
  });

  it("returns a negative net when spending exceeds income", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", amountInCents: 1000, date: "2026-08-01" }),
      transaction({ id: "tx-2", amountInCents: -5000, date: "2026-08-02" }),
    ];

    expect(computeMonthlySummary(transactions, 2026, 8).net).toBe(-4000);
  });
});

describe("computeRunningBalances", () => {
  it("returns an empty list when there are no transactions", () => {
    expect(computeRunningBalances([])).toEqual([]);
  });

  it("orders chronologically and accumulates the running balance", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-3", date: "2026-08-10", amountInCents: -100 }),
      transaction({ id: "tx-1", date: "2026-08-01", amountInCents: 1000 }),
      transaction({ id: "tx-2", date: "2026-08-05", amountInCents: -400 }),
    ];

    const entries = computeRunningBalances(transactions);

    expect(entries.map((e) => e.transactionId)).toEqual([
      "tx-1",
      "tx-2",
      "tx-3",
    ]);
    expect(entries.map((e) => e.balanceAfter)).toEqual([1000, 600, 500]);
  });

  it("can go negative", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", date: "2026-08-01", amountInCents: 100 }),
      transaction({ id: "tx-2", date: "2026-08-02", amountInCents: -500 }),
    ];

    expect(computeRunningBalances(transactions)[1].balanceAfter).toBe(-400);
  });
});

describe("computeAccountBalances", () => {
  it("returns zero balances for accounts with no transactions", () => {
    const accounts: Account[] = [
      account(),
      account({ id: "acc-2", name: "Savings" }),
    ];

    const rollups = computeAccountBalances(accounts, []);

    expect(rollups).toEqual([
      { accountId: "acc-1", name: "Checking", type: "checking", balance: 0 },
      { accountId: "acc-2", name: "Savings", type: "checking", balance: 0 },
    ]);
  });

  it("computes per-account balances and ignores other accounts' transactions", () => {
    const accounts: Account[] = [
      account(),
      account({ id: "acc-2", name: "Savings", type: "savings" }),
    ];
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", accountId: "acc-1", amountInCents: 1000 }),
      transaction({ id: "tx-2", accountId: "acc-2", amountInCents: -500 }),
      transaction({ id: "tx-3", accountId: "acc-1", amountInCents: -200 }),
    ];

    const rollups = computeAccountBalances(accounts, transactions);

    expect(rollups).toEqual([
      { accountId: "acc-1", name: "Checking", type: "checking", balance: 800 },
      { accountId: "acc-2", name: "Savings", type: "savings", balance: -500 },
    ]);
  });
});

describe("computeTotalBalance", () => {
  it("returns zero for no transactions", () => {
    expect(computeTotalBalance([])).toBe(0);
  });

  it("sums across all accounts including negatives", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", amountInCents: 1000 }),
      transaction({ id: "tx-2", amountInCents: -250 }),
    ];
    expect(computeTotalBalance(transactions)).toBe(750);
  });
});

describe("isDuplicateCategoryName", () => {
  const categories: Category[] = [
    category({ id: "cat-1", name: "Groceries" }),
    category({ id: "cat-2", name: "Dining" }),
  ];

  it("returns false when there are no categories", () => {
    expect(isDuplicateCategoryName("Coffee", [])).toBe(false);
  });

  it("returns false for a name that does not exist", () => {
    expect(isDuplicateCategoryName("Coffee", categories)).toBe(false);
  });

  it("detects an exact match", () => {
    expect(isDuplicateCategoryName("Groceries", categories)).toBe(true);
  });

  it("ignores case", () => {
    expect(isDuplicateCategoryName("groceries", categories)).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isDuplicateCategoryName("  Dining  ", categories)).toBe(true);
  });
});

describe("filterTransactionsForAccounts", () => {
  const accounts: Account[] = [
    account({ id: "acc-1", name: "Checking" }),
    account({ id: "acc-2", name: "Savings" }),
  ];

  const transactions: Transaction[] = [
    transaction({ id: "tx-1", accountId: "acc-1" }),
    transaction({ id: "tx-2", accountId: "acc-2" }),
    transaction({ id: "tx-3", accountId: "acc-9" }),
  ];

  it("keeps only transactions belonging to the given accounts", () => {
    const filtered = filterTransactionsForAccounts(transactions, accounts);

    expect(filtered.map((item) => item.id)).toEqual(["tx-1", "tx-2"]);
  });

  it("returns an empty list when there are no accounts", () => {
    expect(filterTransactionsForAccounts(transactions, [])).toEqual([]);
  });

  it("returns an empty list when there are no transactions", () => {
    expect(filterTransactionsForAccounts([], accounts)).toEqual([]);
  });
});

describe("countTransactionsByAccount", () => {
  it("counts transactions per account", () => {
    const transactions: Transaction[] = [
      transaction({ id: "tx-1", accountId: "acc-1" }),
      transaction({ id: "tx-2", accountId: "acc-1" }),
      transaction({ id: "tx-3", accountId: "acc-2" }),
    ];

    const counts = countTransactionsByAccount(transactions);

    expect(counts.get("acc-1")).toBe(2);
    expect(counts.get("acc-2")).toBe(1);
    expect(counts.get("acc-3")).toBeUndefined();
  });

  it("returns an empty map when there are no transactions", () => {
    expect(countTransactionsByAccount([]).size).toBe(0);
  });
});
