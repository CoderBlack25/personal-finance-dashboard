import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFinanceStore } from "@/store/store";
import type { Account, Transaction } from "@/types/types";
import {
  addAccount,
  addCategory,
  addTransaction,
  countTransactionsForAccount,
  deleteCategory,
  deleteAccount,
  getAccounts,
  importTransactions,
  putTransaction,
  updateAccount,
  deleteTransaction,
  updateCategory,
} from "@/services/db";

vi.mock("@/services/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/db")>();
  return {
    ...actual,
    addAccount: vi.fn(),
    addCategory: vi.fn(),
    addTransaction: vi.fn(),
    countTransactionsForAccount: vi.fn(),
    deleteCategory: vi.fn(),
    deleteAccount: vi.fn(),
    getAccounts: vi.fn(),
    importTransactions: vi.fn(),
    putTransaction: vi.fn(),
    updateAccount: vi.fn(),
    deleteTransaction: vi.fn(),
    updateCategory: vi.fn(),
  };
});

const account: Account = {
  id: "account-1",
  name: "Checking",
  type: "checking",
  archived: false,
};

const transaction: Transaction = {
  id: "transaction-1",
  accountId: account.id,
  categoryId: null,
  amountInCents: -500,
  date: "2026-08-01",
  description: "Coffee",
};

describe("UI store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccounts).mockResolvedValue([account]);
    vi.mocked(countTransactionsForAccount).mockResolvedValue(0);
    useFinanceStore.setState({
      selectedAccountId: null,
      activeView: "transactions",
      transactionFilters: {
        searchQuery: "",
        dateFrom: "",
        dateTo: "",
        accountId: "",
        categoryId: null,
      },
      summaryFilters: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      },
      recurringOverrides: {},
      dataRevision: 0,
      isLoading: false,
      error: null,
    });
  });

  it("initializes the selected account without retaining queried records", async () => {
    await useFinanceStore.getState().loadAccounts();
    const state = useFinanceStore.getState();

    expect(state.selectedAccountId).toBe(account.id);
    expect(state).not.toHaveProperty("accounts");
    expect(state).not.toHaveProperty("transactions");
    expect(state).not.toHaveProperty("categories");
  });

  it("preserves a selected active account and falls back when it is unavailable", async () => {
    useFinanceStore.setState({ selectedAccountId: account.id });
    await useFinanceStore.getState().loadAccounts();
    expect(useFinanceStore.getState().selectedAccountId).toBe(account.id);

    vi.mocked(getAccounts).mockResolvedValue([
      { ...account, archived: true },
    ]);
    await useFinanceStore.getState().loadAccounts();
    expect(useFinanceStore.getState().selectedAccountId).toBeNull();
  });

  it("updates and resets transaction filters in Zustand", () => {
    const store = useFinanceStore.getState();
    store.updateTransactionFilters({
      searchQuery: "coffee",
      dateFrom: "2026-08-01",
      categoryId: "food",
      accountId: account.id,
    });
    expect(useFinanceStore.getState().transactionFilters).toMatchObject({
      searchQuery: "coffee",
      dateFrom: "2026-08-01",
      categoryId: "food",
      accountId: account.id,
    });

    useFinanceStore.getState().resetTransactionFilters(null);
    expect(useFinanceStore.getState().transactionFilters).toEqual({
      searchQuery: "",
      dateFrom: "",
      dateTo: "",
      accountId: "",
      categoryId: null,
    });
  });

  it("stores summary month and year filters", () => {
    useFinanceStore.getState().updateSummaryFilters({
      year: 2026,
      month: 8,
    });
    expect(useFinanceStore.getState().summaryFilters).toEqual({
      year: 2026,
      month: 8,
    });
  });

  it("persists recurring overrides as UI preferences", () => {
    const key = JSON.stringify(["monthly utility", "expense"]);
    useFinanceStore.getState().setRecurringOverride(key, false);

    expect(useFinanceStore.getState().recurringOverrides[key]).toBe(false);
    const persistedState = JSON.parse(
      localStorage.getItem("finance-store") ?? "{}",
    ) as { state?: { recurringOverrides?: Record<string, boolean> } };
    expect(persistedState.state?.recurringOverrides?.[key]).toBe(false);
  });

  it("selects a newly created account and invalidates queried data", async () => {
    vi.mocked(addAccount).mockResolvedValue(account);

    await useFinanceStore.getState().createAccount({
      name: account.name,
      type: account.type,
    });

    expect(useFinanceStore.getState().selectedAccountId).toBe(account.id);
    expect(useFinanceStore.getState().dataRevision).toBe(1);
    expect(useFinanceStore.getState()).not.toHaveProperty("accounts");
  });

  it("invalidates data after transaction and category mutations", async () => {
    vi.mocked(addTransaction).mockResolvedValue(transaction);
    vi.mocked(putTransaction).mockResolvedValue(undefined);
    vi.mocked(deleteTransaction).mockResolvedValue(undefined);
    vi.mocked(addCategory).mockResolvedValue({
      id: "category-1",
      name: "Food",
    });
    vi.mocked(updateCategory).mockResolvedValue(undefined);
    vi.mocked(deleteCategory).mockResolvedValue(undefined);

    const store = useFinanceStore.getState();
    await store.createTransaction(transaction);
    await store.updateTransaction(transaction);
    await store.deleteTransaction(transaction.id);
    await store.createCategory({ name: "Food" });
    await store.updateCategory({ id: "category-1", name: "Food & Drink" });
    useFinanceStore.getState().updateTransactionFilters({
      categoryId: "category-1",
    });
    await store.deleteCategory("category-1");

    expect(useFinanceStore.getState().dataRevision).toBe(6);
    expect(useFinanceStore.getState().transactionFilters.categoryId).toBeNull();
  });

  it("reports transaction errors without persisting domain data in the store", async () => {
    vi.mocked(addTransaction).mockRejectedValue(new Error("storage failed"));

    await useFinanceStore.getState().createTransaction(transaction);

    expect(useFinanceStore.getState().error).toBe("Could not save transaction.");
    expect(useFinanceStore.getState()).not.toHaveProperty("allTransactions");
  });

  it("archives and restores accounts through IndexedDB", async () => {
    vi.mocked(getAccounts).mockResolvedValue([account]);
    vi.mocked(updateAccount).mockResolvedValue(undefined);

    expect(await useFinanceStore.getState().archiveAccount(account.id)).toBeNull();
    expect(updateAccount).toHaveBeenCalledWith({
      ...account,
      archived: true,
    });
    expect(useFinanceStore.getState().dataRevision).toBe(1);

    vi.mocked(getAccounts).mockResolvedValue([{ ...account, archived: true }]);
    expect(await useFinanceStore.getState().restoreAccount(account.id)).toBeNull();
    expect(updateAccount).toHaveBeenLastCalledWith({
      ...account,
      archived: false,
    });
    expect(useFinanceStore.getState().dataRevision).toBe(2);
  });

  it("prevents deleting accounts with transactions and deletes empty accounts", async () => {
    vi.mocked(countTransactionsForAccount).mockResolvedValueOnce(1);
    const failure = await useFinanceStore.getState().deleteAccount(account.id);
    expect(failure).toMatch(/still has transactions/i);
    expect(deleteAccount).not.toHaveBeenCalled();

    vi.mocked(countTransactionsForAccount).mockResolvedValueOnce(0);
    vi.mocked(deleteAccount).mockResolvedValue(undefined);
    expect(await useFinanceStore.getState().deleteAccount(account.id)).toBeNull();
    expect(deleteAccount).toHaveBeenCalledWith(account.id);
    expect(useFinanceStore.getState().dataRevision).toBe(1);
  });

  it("invalidates queried data after imports and transaction deletion", async () => {
    vi.mocked(importTransactions).mockResolvedValue([transaction]);
    vi.mocked(deleteTransaction).mockResolvedValue(undefined);

    const imported = await useFinanceStore.getState().importTransactions({
      accountId: account.id,
      transactions: [
        {
          amountInCents: transaction.amountInCents,
          date: transaction.date,
          description: transaction.description,
          categoryId: null,
        },
      ],
    });
    expect(imported).toBe(true);
    expect(await useFinanceStore.getState().deleteTransaction(transaction.id)).toBeNull();
    expect(useFinanceStore.getState().dataRevision).toBe(2);
  });

  it("reports category creation errors", async () => {
    vi.mocked(addCategory).mockRejectedValue(new Error("storage failed"));

    expect(await useFinanceStore.getState().createCategory({ name: "Food" })).toBe(
      "Could not create category.",
    );
  });

  it("reports category update and deletion errors", async () => {
    vi.mocked(updateCategory).mockRejectedValue(new Error("storage failed"));
    vi.mocked(deleteCategory).mockRejectedValue(new Error("storage failed"));

    expect(
      await useFinanceStore
        .getState()
        .updateCategory({ id: "category-1", name: "Food" }),
    ).toBe("Could not update category.");
    expect(await useFinanceStore.getState().deleteCategory("category-1")).toBe(
      "Could not delete category.",
    );
  });
});
