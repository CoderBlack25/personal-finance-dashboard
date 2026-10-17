import { create } from "zustand";
import type { Account, Category, Transaction } from "@/types/types";
import {
  addAccount,
  getAccounts,
  addTransaction,
  getTransactionsForAccount,
  putTransaction,
  getCategories,
  addCategory,
} from "../services/db";

interface FinanceStore {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  createAccount: (input: Omit<Account, "id">) => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
  createTransaction: (input: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  loadCategories: () => Promise<void>;
  createCategory: (input: Omit<Category, "id">) => Promise<void>;
}

export const useFinanceStore = create<FinanceStore>()((set, get) => ({
  // The state represents data.
  accounts: [],
  transactions: [],
  categories: [],
  selectedAccountId: null,
  isLoading: false,
  error: null,

  // The actions represent things you can do to that data.
  loadAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const [accounts, categories] = await Promise.all([
        getAccounts(),
        getCategories(),
      ]);
      set({ accounts, categories, isLoading: false });

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

  updateTransaction: async (transaction) => {
    set({ isLoading: true, error: null });
    try {
      await putTransaction(transaction);
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === transaction.id ? transaction : t,
        ),
        isLoading: false,
      }));
    } catch {
      set({ error: "Could not update transaction.", isLoading: false });
    }
  },

  loadCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await getCategories();
      set({ categories, isLoading: false });
    } catch {
      set({ error: "Could not load categories.", isLoading: false });
    }
  },

  createCategory: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const category = await addCategory(input);
      set((state) => ({
        categories: [...state.categories, category],
        isLoading: false,
      }));
    } catch {
      set({ error: "Could not create category.", isLoading: false });
    }
  },
}));
