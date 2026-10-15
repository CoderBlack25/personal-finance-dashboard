import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Account, Category, Transaction } from "../types/types";

const DB_NAME = "finance-dashboard";
const DB_VERSION = 2;

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-income", name: "Income", color: "#14b8a6" },
  { id: "cat-groceries", name: "Groceries", color: "#22c55e" },
  { id: "cat-dining", name: "Dining", color: "#f97316" },
  { id: "cat-transport", name: "Transport", color: "#3b82f6" },
  { id: "cat-housing", name: "Housing", color: "#8b5cf6" },
  { id: "cat-entertainment", name: "Entertainment", color: "#ec4899" },
  { id: "cat-other", name: "Other", color: "#94a3b8" },
];

interface FinanceDB extends DBSchema {
  accounts: {
    key: string;
    value: Account;
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: { "by-account": string };
  };
  categories: {
    key: string;
    value: Category;
  };
}

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null;

function getDB(): Promise<IDBPDatabase<FinanceDB>> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<FinanceDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          db.createObjectStore("accounts", { keyPath: "id" });
          const txStore = db.createObjectStore("transactions", {
            keyPath: "id",
          });
          txStore.createIndex("by-account", "accountId");
        }

        if (oldVersion < 2) {
          db.createObjectStore("categories", { keyPath: "id" });
          const catStore = transaction.objectStore("categories");
          for (const category of DEFAULT_CATEGORIES) {
            catStore.add(category);
          }
        }
      },
    });
  }
  return dbPromise;
}

// ── Accounts ────────────────────────────────────────────────────────────────

export async function addAccount(input: Omit<Account, "id">): Promise<Account> {
  const db = await getDB();
  const account: Account = { ...input, id: crypto.randomUUID() };
  await db.add("accounts", account);
  return account;
}

export async function getAccounts(): Promise<Account[]> {
  const db = await getDB();
  return db.getAll("accounts");
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(
  input: Omit<Transaction, "id">,
): Promise<Transaction> {
  const db = await getDB();
  const transaction: Transaction = { ...input, id: crypto.randomUUID() };
  await db.add("transactions", transaction);
  return transaction;
}

export async function getTransactionsForAccount(
  accountId: string,
): Promise<Transaction[]> {
  const db = await getDB();
  return db.getAllFromIndex("transactions", "by-account", accountId);
}

export async function putTransaction(transaction: Transaction): Promise<void> {
  const db = await getDB();
  await db.put("transactions", transaction);
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAll("categories");
}

export async function addCategory(
  input: Omit<Category, "id">,
): Promise<Category> {
  const db = await getDB();
  const category: Category = { ...input, id: crypto.randomUUID() };
  await db.add("categories", category);
  return category;
}
