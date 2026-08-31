import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFinanceStore } from "../../store";
import type { Account } from "../../types";
import {
  addAccount,
  getAccounts,
  addTransaction,
  getTransactionsForAccount,
  putTransaction,
} from "../../db";

vi.mock("../../db", () => ({
  addAccount: vi.fn(),
  getAccounts: vi.fn(),
  addTransaction: vi.fn(),
  getTransactionsForAccount: vi.fn(),
  putTransaction: vi.fn(),
}));

describe("store", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useFinanceStore.setState({
      accounts: [],
      transactions: [],
      selectedAccountId: null,
      isLoading: false,
      error: null,
    });
  });

  it("loads accounts successfully", async () => {
    const accounts: Account[] = [
      {
        id: "account-1",
        name: "Checking",
        type: "checking",
      },
      {
        id: "account-2",
        name: "Savings",
        type: "savings",
      },
    ];

    vi.mocked(getAccounts).mockResolvedValue(accounts);

    await useFinanceStore.getState().loadAccounts();

    const state = useFinanceStore.getState();

    expect(state.accounts).toEqual(accounts);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("automatically selects the first account when no account is selected", async () => {
    const accounts: Account[] = [
      {
        id: "account-1",
        name: "Checking",
        type: "checking",
      },
      {
        id: "account-2",
        name: "Savings",
        type: "savings",
      },
    ];

    const transactions = [
      {
        id: "transaction-1",
        accountId: "account-1",
        description: "Groceries",
        amountInCents: -5000,
        date: "2026-08-28",
      },
    ];

    vi.mocked(getAccounts).mockResolvedValue(accounts);
    vi.mocked(getTransactionsForAccount).mockResolvedValue(transactions);

    await useFinanceStore.getState().loadAccounts();

    const state = useFinanceStore.getState();

    expect(state.selectedAccountId).toBe("account-1");
    expect(state.transactions).toEqual(transactions);
    expect(getTransactionsForAccount).toHaveBeenCalledWith("account-1");
  });

  it("sets an error when loading accounts fails", async () => {
    vi.mocked(getAccounts).mockRejectedValue(new Error("Database error"));

    await useFinanceStore.getState().loadAccounts();

    const state = useFinanceStore.getState();

    expect(state.accounts).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Could not load accounts.");
  });

  it("creates an account and selects it", async () => {
    const input = {
      name: "Checking",
      type: "checking" as const,
    };

    const account: Account = {
      id: "account-1",
      name: "Checking",
      type: "checking",
    };

    vi.mocked(addAccount).mockResolvedValue(account);

    await useFinanceStore.getState().createAccount(input);

    const state = useFinanceStore.getState();

    expect(addAccount).toHaveBeenCalledWith(input);
    expect(state.accounts).toEqual([account]);
    expect(state.selectedAccountId).toBe("account-1");
    expect(state.transactions).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("adds a new account without removing existing accounts", async () => {
    const existingAccount: Account = {
      id: "account-1",
      name: "Checking",
      type: "checking",
    };

    const newAccount: Account = {
      id: "account-2",
      name: "Savings",
      type: "savings",
    };

    useFinanceStore.setState({
      accounts: [existingAccount],
      transactions: [],
      selectedAccountId: "account-1",
      isLoading: false,
      error: null,
    });

    vi.mocked(addAccount).mockResolvedValue(newAccount);

    await useFinanceStore.getState().createAccount({
      name: "Savings",
      type: "savings",
    });

    const state = useFinanceStore.getState();

    expect(state.accounts).toEqual([existingAccount, newAccount]);

    expect(state.selectedAccountId).toBe("account-2");
  });

  it("selects an account and loads its transactions", async () => {
    const transactions = [
      {
        id: "transaction-1",
        accountId: "account-1",
        description: "Groceries",
        amountInCents: -5000,
        date: "2026-08-28",
      },
    ];

    vi.mocked(getTransactionsForAccount).mockResolvedValue(transactions);

    await useFinanceStore.getState().selectAccount("account-1");

    const state = useFinanceStore.getState();

    expect(getTransactionsForAccount).toHaveBeenCalledWith("account-1");
    expect(state.selectedAccountId).toBe("account-1");
    expect(state.transactions).toEqual(transactions);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("sets an error when loading transactions fails", async () => {
    vi.mocked(getTransactionsForAccount).mockRejectedValue(
      new Error("Database error"),
    );

    await useFinanceStore.getState().selectAccount("account-1");

    const state = useFinanceStore.getState();

    expect(state.selectedAccountId).toBe("account-1");
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Could not load transactions.");
  });

  it("creates a transaction and adds it to the store", async () => {
    const input = {
      accountId: "account-1",
      description: "Groceries",
      amountInCents: -5000,
      date: "2026-08-28",
    };

    const transaction = {
      id: "transaction-1",
      ...input,
    };

    vi.mocked(addTransaction).mockResolvedValue(transaction);

    await useFinanceStore.getState().createTransaction(input);

    const state = useFinanceStore.getState();

    expect(addTransaction).toHaveBeenCalledWith(input);
    expect(state.transactions).toEqual([transaction]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("sets an error when creating a transaction fails", async () => {
    vi.mocked(addTransaction).mockRejectedValue(new Error("Database error"));

    await useFinanceStore.getState().createTransaction({
      accountId: "account-1",
      description: "Groceries",
      amountInCents: -5000,
      date: "2026-08-28",
    });

    const state = useFinanceStore.getState();

    expect(state.transactions).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Could not save transaction.");
  });

  it("updates an existing transaction", async () => {
    const originalTransaction = {
      id: "transaction-1",
      accountId: "account-1",
      description: "Groceries",
      amountInCents: -5000,
      date: "2026-08-28",
    };

    const anotherTransaction = {
      id: "transaction-2",
      accountId: "account-1",
      description: "Transport",
      amountInCents: -2000,
      date: "2026-08-27",
    };

    const updatedTransaction = {
      ...originalTransaction,
      description: "Updated groceries",
      amountInCents: -6000,
    };

    useFinanceStore.setState({
      transactions: [originalTransaction, anotherTransaction],
    });

    vi.mocked(putTransaction).mockResolvedValue(undefined);

    await useFinanceStore.getState().updateTransaction(updatedTransaction);

    const state = useFinanceStore.getState();

    expect(putTransaction).toHaveBeenCalledWith(updatedTransaction);

    expect(state.transactions).toEqual([
      updatedTransaction,
      anotherTransaction,
    ]);

    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("sets an error when updating a transaction fails", async () => {
    const transaction = {
      id: "transaction-1",
      accountId: "account-1",
      description: "Groceries",
      amountInCents: -5000,
      date: "2026-08-28",
    };

    useFinanceStore.setState({
      transactions: [transaction],
    });

    vi.mocked(putTransaction).mockRejectedValue(new Error("Database error"));

    await useFinanceStore.getState().updateTransaction(transaction);

    const state = useFinanceStore.getState();

    expect(state.transactions).toEqual([transaction]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Could not update transaction.");
  });
});
