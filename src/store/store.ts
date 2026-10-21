import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Account, Category, Transaction } from "@/types/types";
import {
  addAccount,
  getAccounts,
  addTransaction,
  getTransactionsForAccount,
  getAllTransactions,
  putTransaction,
  getCategories,
  addCategory,
  importTransactions,
} from "../services/db";

export type View = "dashboard" | "transactions" | "summary";

interface FinanceStore {
  accounts: Account[];
  transactions: Transaction[];
  allTransactions: Transaction[];
  categories: Category[];
  selectedAccountId: string | null;
  activeView: View;
  isLoading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  loadAllTransactions: () => Promise<void>;
  createAccount: (input: Omit<Account, "id">) => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
  createTransaction: (input: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  importTransactions: (input: {
    accountId: string;
    transactions: Array<{
      date: string;
      amountInCents: number;
      description: string;
      categoryId: string | null;
    }>;
  }) => Promise<void>;
  loadCategories: () => Promise<void>;
  createCategory: (input: Omit<Category, "id">) => Promise<void>;
  setActiveView: (view: View) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      // The state represents data.
      accounts: [],
      transactions: [],
      allTransactions: [],
      categories: [],
      selectedAccountId: null,
      activeView: "transactions",
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

          const state = get();
          if (state.selectedAccountId) {
            await get().selectAccount(state.selectedAccountId);
          } else if (accounts.length > 0) {
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

      loadAllTransactions: async () => {
        set({ isLoading: true, error: null });
        try {
          const transactions = await getAllTransactions();
          set({ allTransactions: transactions, isLoading: false });
        } catch {
          set({ error: "Could not load transactions.", isLoading: false });
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

      importTransactions: async ({ accountId, transactions }) => {
        set({ isLoading: true, error: null });
        try {
          const imported = await importTransactions(
            transactions.map((t) => ({
              accountId,
              amountInCents: t.amountInCents,
              date: t.date,
              description: t.description,
              categoryId: t.categoryId,
            })),
          );
          set((state) => ({
            transactions: [...state.transactions, ...imported],
            allTransactions: [...state.allTransactions, ...imported],
            isLoading: false,
          }));
        } catch {
          set({ error: "Could not import transactions.", isLoading: false });
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

      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: "finance-store",
      partialize: (state) => ({
        activeView: state.activeView,
        selectedAccountId: state.selectedAccountId,
      }),
    },
  ),
);
