import { create } from "zustand";
import type { Account, Transaction } from "./types";
import {
  addAccount,
  getAccounts,
  addTransaction,
  getTransactionsForAccount,
} from "./db";

interface FinanceStore {
  accounts: Account[];
  transactions: Transaction[];
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  createAccount: (input: Omit<Account, "id">) => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
  createTransaction: (input: Omit<Transaction, "id">) => Promise<void>;
}

export const useFinanceStore = create<FinanceStore>()((set, get) => ({
  // The state represents data.
  accounts: [],
  transactions: [],
  selectedAccountId: null,
  isLoading: false,
  error: null,

  // The actions represent things you can do to that data.
  loadAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const accounts = await getAccounts();
      set({ accounts, isLoading: false });

      if (!get().selectedAccountId && accounts.length > 0) {
        await get().selectAccount(accounts[0].id);
      }
    } catch {
      set({ error: "Could not load accounts.", isLoading: false });
    }
  },

  createAccount: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const account = await addAccount(input);

      set((state) => ({
        accounts: [...state.accounts, account],
        selectedAccountId: account.id,
        transactions: [],
        isLoading: false,
      }));
    } catch {
      set({
        error: "Could not create account.",
        isLoading: false,
      });
    }
  },

  selectAccount: async (accountId) => {
    set({ selectedAccountId: accountId, isLoading: true, error: null });
    try {
      const transactions = await getTransactionsForAccount(accountId);
      set({ transactions, isLoading: false });
    } catch {
      set({ error: "Could not load transactions.", isLoading: false });
    }
  },

  createTransaction: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const transaction = await addTransaction(input);
      set((state) => ({
        transactions: [...state.transactions, transaction],
        isLoading: false,
      }));
    } catch {
      set({ error: "Could not save transaction.", isLoading: false });
    }
  },
}));
