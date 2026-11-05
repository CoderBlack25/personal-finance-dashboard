import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Account,
  Category,
  CategoryBudget,
  Transaction,
} from "@/types/types";
import {
  addAccount,
  getAccounts,
  addTransaction,
  putTransaction,
  addCategory,
  updateCategory as updateCategoryRecord,
  deleteCategory as deleteCategoryRecord,
  setCategoryBudget as setCategoryBudgetRecord,
  deleteCategoryBudget as deleteCategoryBudgetRecord,
  importTransactions as importTransactionsDb,
  updateAccount as updateAccountRecord,
  deleteAccount as deleteAccountRecord,
  countTransactionsForAccount,
  deleteTransaction as deleteTransactionRecord,
} from "../services/db";

export type View =
  | "dashboard"
  | "transactions"
  | "summary"
  | "categories"
  | "budgets";

interface FinanceStore {
  selectedAccountId: string | null;
  activeView: View;
  transactionFilters: {
    searchQuery: string;
    dateFrom: string;
    dateTo: string;
    accountId: string;
    categoryId: string | null;
  };
  summaryFilters: {
    year: number;
    month: number;
  };
  recurringOverrides: Record<string, boolean>;
  dataRevision: number;
  isLoading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  createAccount: (input: Omit<Account, "id" | "archived">) => Promise<void>;
  updateAccount: (account: Account) => Promise<string | null>;
  archiveAccount: (accountId: string) => Promise<string | null>;
  restoreAccount: (accountId: string) => Promise<string | null>;
  deleteAccount: (accountId: string) => Promise<string | null>;
  selectAccount: (accountId: string) => void;
  createTransaction: (input: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<string | null>;
  importTransactions: (input: {
    accountId: string;
    transactions: Array<{
      date: string;
      amountInCents: number;
      description: string;
      categoryId: string | null;
    }>;
  }) => Promise<boolean>;
  createCategory: (input: Omit<Category, "id">) => Promise<string | null>;
  updateCategory: (category: Category) => Promise<string | null>;
  deleteCategory: (categoryId: string) => Promise<string | null>;
  setCategoryBudget: (budget: CategoryBudget) => Promise<string | null>;
  deleteCategoryBudget: (categoryId: string) => Promise<string | null>;
  setActiveView: (view: View) => void;
  updateTransactionFilters: (
    filters: Partial<FinanceStore["transactionFilters"]>,
  ) => void;
  resetTransactionFilters: (accountId: string | null) => void;
  updateSummaryFilters: (filters: Partial<FinanceStore["summaryFilters"]>) => void;
  setRecurringOverride: (groupKey: string, isRecurring: boolean) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
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

      loadAccounts: async () => {
        set({ isLoading: true, error: null });
        try {
          const accounts = (await getAccounts()).filter(
            (account) => !account.archived,
          );
          const selectedAccountId = accounts.some(
            (account) => account.id === get().selectedAccountId,
          )
            ? get().selectedAccountId
            : (accounts[0]?.id ?? null);
          set({ selectedAccountId, isLoading: false });
        } catch {
          set({ error: "Could not load accounts.", isLoading: false });
        }
      },

      createAccount: async (input) => {
        set({ isLoading: true, error: null });

        try {
          const account = await addAccount(input);
          set((state) => ({
            selectedAccountId: account.id,
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
        } catch {
          set({
            error: "Could not create account.",
            isLoading: false,
          });
        }
      },

      updateAccount: async (account) => {
        set({ isLoading: true, error: null });
        try {
          await updateAccountRecord(account);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not update account.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      archiveAccount: async (accountId) => {
        set({ isLoading: true, error: null });
        try {
          const account = (await getAccounts()).find(
            (item) => item.id === accountId,
          );
          if (!account) {
            set({ isLoading: false });
            return null;
          }

          const archived = { ...account, archived: true };
          await updateAccountRecord(archived);

          const activeAccounts = (await getAccounts()).filter(
            (item) => !item.archived,
          );
          set((state) => ({
            selectedAccountId:
              state.selectedAccountId === accountId
                ? (activeAccounts[0]?.id ?? null)
                : state.selectedAccountId,
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not archive account.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      restoreAccount: async (accountId) => {
        set({ isLoading: true, error: null });
        try {
          const account = (await getAccounts()).find(
            (item) => item.id === accountId,
          );
          if (!account) {
            set({ isLoading: false });
            return null;
          }

          const restored = { ...account, archived: false };
          await updateAccountRecord(restored);

          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not restore account.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      deleteAccount: async (accountId) => {
        set({ isLoading: true, error: null });
        try {
          const transactionCount = await countTransactionsForAccount(accountId);
          if (transactionCount > 0) {
            const message =
              "This account still has transactions. Archive it instead.";
            set({ error: message, isLoading: false });
            return message;
          }

          await deleteAccountRecord(accountId);

          const activeAccounts = (await getAccounts()).filter(
            (item) => !item.archived,
          );
          set((state) => ({
            selectedAccountId:
              state.selectedAccountId === accountId
                ? (activeAccounts[0]?.id ?? null)
                : state.selectedAccountId,
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not delete account.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      selectAccount: (accountId) => {
        set({ selectedAccountId: accountId, error: null });
      },

      createTransaction: async (input) => {
        set({ isLoading: true, error: null });
        try {
          await addTransaction(input);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
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
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
        } catch {
          set({ error: "Could not update transaction.", isLoading: false });
        }
      },

      deleteTransaction: async (transactionId) => {
        set({ isLoading: true, error: null });
        try {
          await deleteTransactionRecord(transactionId);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not delete transaction.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      importTransactions: async ({ accountId, transactions }) => {
        set({ isLoading: true, error: null });
        try {
          await importTransactionsDb(
            transactions.map((t) => ({
              accountId,
              amountInCents: t.amountInCents,
              date: t.date,
              description: t.description,
              categoryId: t.categoryId,
            })),
          );
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return true;
        } catch {
          set({ error: "Could not import transactions.", isLoading: false });
          return false;
        }
      },

      createCategory: async (input) => {
        set({ isLoading: true, error: null });
        try {
          await addCategory(input);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch (cause) {
          const message = "Could not create category.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      updateCategory: async (category) => {
        set({ isLoading: true, error: null });
        try {
          await updateCategoryRecord(category);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not update category.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      deleteCategory: async (categoryId) => {
        set({ isLoading: true, error: null });
        try {
          await deleteCategoryRecord(categoryId);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            transactionFilters:
              state.transactionFilters.categoryId === categoryId
                ? { ...state.transactionFilters, categoryId: null }
                : state.transactionFilters,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not delete category.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      setCategoryBudget: async (budget) => {
        set({ isLoading: true, error: null });
        try {
          await setCategoryBudgetRecord(budget);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not save category budget.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      deleteCategoryBudget: async (categoryId) => {
        set({ isLoading: true, error: null });
        try {
          await deleteCategoryBudgetRecord(categoryId);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not remove category budget.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      setActiveView: (view) => set({ activeView: view, error: null }),
      updateTransactionFilters: (filters) =>
        set((state) => ({
          transactionFilters: { ...state.transactionFilters, ...filters },
        })),
      resetTransactionFilters: (accountId) =>
        set({
          transactionFilters: {
            searchQuery: "",
            dateFrom: "",
            dateTo: "",
            accountId: accountId ?? "",
            categoryId: null,
          },
        }),
      updateSummaryFilters: (filters) =>
        set((state) => ({
          summaryFilters: { ...state.summaryFilters, ...filters },
        })),
      setRecurringOverride: (groupKey, isRecurring) =>
        set((state) => ({
          recurringOverrides: {
            ...state.recurringOverrides,
            [groupKey]: isRecurring,
          },
        })),
    }),
    {
      name: "finance-store",
      partialize: (state) => ({
        activeView: state.activeView,
        selectedAccountId: state.selectedAccountId,
        recurringOverrides: state.recurringOverrides,
      }),
    },
  ),
);
