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
  importTransactions as importTransactionsDb,
  updateAccount,
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
  accounts: Account[];
  archivedAccounts: Account[];
  transactions: Transaction[];
  allTransactions: Transaction[];
  categories: Category[];
  selectedAccountId: string | null;
  activeView: View;
  isLoading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  loadAllTransactions: () => Promise<void>;
  createAccount: (input: Omit<Account, "id" | "archived">) => Promise<void>;
  archiveAccount: (accountId: string) => Promise<string | null>;
  restoreAccount: (accountId: string) => Promise<string | null>;
  deleteAccount: (accountId: string) => Promise<string | null>;
  selectAccount: (accountId: string) => Promise<void>;
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
  loadCategories: () => Promise<void>;
  createCategory: (input: Omit<Category, "id">) => Promise<string | null>;
  setActiveView: (view: View) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      // The state represents data.
      accounts: [],
      archivedAccounts: [],
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
          const [allAccounts, categories] = await Promise.all([
            getAccounts(),
            getCategories(),
          ]);
          set({
            accounts: allAccounts.filter((account) => !account.archived),
            archivedAccounts: allAccounts.filter((account) => account.archived),
            categories,
            isLoading: false,
          });

          await selectActiveAccount(get, set);
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

      archiveAccount: async (accountId) => {
        set({ isLoading: true, error: null });
        try {
          const account = get().accounts.find((item) => item.id === accountId);
          if (!account) {
            set({ isLoading: false });
            return null;
          }

          const archived = { ...account, archived: true };
          await updateAccount(archived);

          set((state) => ({
            accounts: state.accounts.filter((item) => item.id !== accountId),
            archivedAccounts: [...state.archivedAccounts, archived],
            isLoading: false,
          }));

          if (get().selectedAccountId === accountId) {
            await selectActiveAccount(get, set);
          }
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
          const account = get().archivedAccounts.find(
            (item) => item.id === accountId,
          );
          if (!account) {
            set({ isLoading: false });
            return null;
          }

          const restored = { ...account, archived: false };
          await updateAccount(restored);

          set((state) => ({
            accounts: [...state.accounts, restored],
            archivedAccounts: state.archivedAccounts.filter(
              (item) => item.id !== accountId,
            ),
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

          set((state) => ({
            accounts: state.accounts.filter((item) => item.id !== accountId),
            archivedAccounts: state.archivedAccounts.filter(
              (item) => item.id !== accountId,
            ),
            isLoading: false,
          }));

          if (get().selectedAccountId === accountId) {
            await selectActiveAccount(get, set);
          }
          return null;
        } catch {
          const message = "Could not delete account.";
          set({ error: message, isLoading: false });
          return message;
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
          const transaction = await addTransaction({
            ...input,
            batchId: (input as { batchId?: string | null }).batchId ?? null,
          });
          set((state) => ({
            transactions: [...state.transactions, transaction],
            // `allTransactions` drives the per-account transaction counts that
            // decide whether the account delete action is available. Leaving it
            // stale would offer a delete that the store then refuses.
            allTransactions: [...state.allTransactions, transaction],
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
            allTransactions: state.allTransactions.map((t) =>
              t.id === transaction.id ? transaction : t,
            ),
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
            transactions: state.transactions.map((t) =>
              t.id === transactionId ? voided : t,
            ),
            allTransactions: state.allTransactions.map((t) =>
              t.id === transactionId ? voided : t,
            ),
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
          const transactions = await getAllTransactions();
          const selectedAccountId = get().selectedAccountId;
          let accountTransactions: Transaction[] = [];
          if (selectedAccountId) {
            accountTransactions = await getTransactionsForAccount(selectedAccountId);
          }
          set({
            allTransactions: transactions,
            transactions: accountTransactions,
            isLoading: false,
          });
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
          const imported = await importTransactionsDb(
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
            transactions: [...state.transactions, ...imported],
            allTransactions: [...state.allTransactions, ...imported],
            isLoading: false,
          }));
          return batchId;
        } catch {
          set({ error: "Could not import transactions.", isLoading: false });
          return null;
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





async function selectActiveAccount(
  get: () => FinanceStore,
  set: (
    partial:
      | Partial<FinanceStore>
      | ((state: FinanceStore) => Partial<FinanceStore>),
  ) => void,
): Promise<void> {
  const state = get();
  const selected = state.accounts.find(
    (account) => account.id === state.selectedAccountId,
  );
  const next = selected ?? state.accounts[0];

  if (!next) {
    set({ selectedAccountId: null, transactions: [] });
    return;
  }

  await get().selectAccount(next.id);
}


