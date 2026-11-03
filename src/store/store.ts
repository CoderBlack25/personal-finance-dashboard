import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Account, Category, Transaction } from "@/types/types";
import {
  addAccount,
  getAccounts,
  addTransaction,
  putTransaction,
  addCategory,
  importTransactions as importTransactionsDb,
  updateAccount as updateAccountRecord,
  deleteAccount as deleteAccountRecord,
  countTransactionsForAccount,
  CategoryValidationError,
  voidTransaction,
  voidTransactionBatch,
} from "../services/db";

export type View =
  | "dashboard"
  | "transactions"
  | "summary"
  | "categories";

interface FinanceStore {
  selectedAccountId: string | null;
  activeView: View;
  transactionFilters: {
    searchQuery: string;
    dateFrom: string;
    dateTo: string;
    accountId: string;
    categoryId: string | null;
    showVoided: boolean;
  };
  summaryFilters: {
    dateFrom: string;
    dateTo: string;
    year: number;
    month: number;
  };
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
  voidTransaction: (transactionId: string, reason?: string) => Promise<string | null>;
  voidTransactionBatch: (batchId: string) => Promise<number>;
  importTransactions: (input: {
    accountId: string;
    transactions: Array<{
      date: string;
      amountInCents: number;
      description: string;
      categoryId: string | null;
    }>;
  }) => Promise<string | null>;
  createCategory: (input: Omit<Category, "id">) => Promise<string | null>;
  setActiveView: (view: View) => void;
  updateTransactionFilters: (
    filters: Partial<FinanceStore["transactionFilters"]>,
  ) => void;
  resetTransactionFilters: (accountId: string | null) => void;
  updateSummaryFilters: (filters: Partial<FinanceStore["summaryFilters"]>) => void;
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
        showVoided: false,
      },
      summaryFilters: {
        dateFrom: "",
        dateTo: "",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      },
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
          await addTransaction({
            ...input,
            batchId: (input as { batchId?: string | null }).batchId ?? null,
          });
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

      voidTransaction: async (transactionId, reason) => {
        set({ isLoading: true, error: null });
        try {
          const voided = await voidTransaction(transactionId, reason);
          if (!voided) {
            set({ isLoading: false });
            return null;
          }
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return null;
        } catch {
          const message = "Could not void transaction.";
          set({ error: message, isLoading: false });
          return message;
        }
      },

      voidTransactionBatch: async (batchId) => {
        set({ isLoading: true, error: null });
        try {
          const count = await voidTransactionBatch(batchId);
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return count;
        } catch {
          set({ error: "Could not void import batch.", isLoading: false });
          return 0;
        }
      },

      importTransactions: async ({ accountId, transactions }) => {
        set({ isLoading: true, error: null });
        try {
          const batchId = crypto.randomUUID();
          await importTransactionsDb(
            transactions.map((t) => ({
              accountId,
              amountInCents: t.amountInCents,
              date: t.date,
              description: t.description,
              categoryId: t.categoryId,
              batchId,
            })),
          );
          set((state) => ({
            dataRevision: state.dataRevision + 1,
            isLoading: false,
          }));
          return batchId;
        } catch {
          set({ error: "Could not import transactions.", isLoading: false });
          return null;
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
          const message =
            cause instanceof CategoryValidationError
              ? cause.message
              : "Could not create category.";
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
            showVoided: false,
          },
        }),
      updateSummaryFilters: (filters) =>
        set((state) => ({
          summaryFilters: { ...state.summaryFilters, ...filters },
        })),
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
