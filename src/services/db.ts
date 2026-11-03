import { openDB, type DBSchema, type IDBPDatabase, unwrap } from "idb";
import type { Account, Category, Transaction } from "@/types/types";
import { HEX_COLOR_REGEX } from "@/schemas/categorySchema";

const DB_NAME = "finance-dashboard";
const DB_VERSION = 5;

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

        if (oldVersion < 5) {
          const transactionStore = unwrap(
            transaction.objectStore("transactions"),
          );
          if (transactionStore.indexNames.contains("by-batch")) {
            transactionStore.deleteIndex("by-batch");
          }
          const cursorRequest = transactionStore.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            for (const field of [
              "status",
              "voidedAt",
              "voidReason",
              "reversesId",
              "batchId",
            ]) {
              Reflect.deleteProperty(cursor.value, field);
            }
            cursor.update(cursor.value);
            cursor.continue();
          };
        }
      },
    });
  }
  return dbPromise;
}

// ── Accounts ────────────────────────────────────────────────────────────────

export async function addAccount(
  input: Omit<Account, "id" | "archived">,
): Promise<Account> {
  const db = await getDB();
  const account: Account = {
    ...input,
    archived: false,
    id: crypto.randomUUID(),
  };
  await db.add("accounts", account);
  return account;
}

export async function getAccounts(): Promise<Account[]> {
  const db = await getDB();
  const accounts = await db.getAll("accounts");
  // Accounts written before archiving existed have no `archived` field. The
  // stored schema (stores and indexes) is unchanged, so no version bump is
  // needed; the flag is normalized on read and persisted on the next write.
  return accounts.map((account) => ({
    ...account,
    archived: account.archived === true,
  }));
}

export async function updateAccount(account: Account): Promise<void> {
  const db = await getDB();
  await db.put("accounts", account);
}

export async function deleteAccount(accountId: string): Promise<void> {
  const db = await getDB();
  await db.delete("accounts", accountId);
}

export async function countTransactionsForAccount(
  accountId: string,
): Promise<number> {
  const db = await getDB();
  const transactions = await db.getAllFromIndex(
    "transactions",
    "by-account",
    accountId,
  );
  return transactions.length;
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(
  input: Omit<Transaction, "id">,
): Promise<Transaction> {
  const db = await getDB();
  const tx = db.transaction("transactions", "readwrite");
  const existingTransactions = await tx.store.getAll();
  const latestCreatedAt = existingTransactions.reduce(
    (latest, transaction) =>
      Math.max(latest, Date.parse(transaction.createdAt ?? "") || 0),
    0,
  );
  const transaction: Transaction = {
    ...input,
    createdAt: new Date(Math.max(Date.now(), latestCreatedAt + 1)).toISOString(),
    id: crypto.randomUUID(),
  };
  await tx.store.add(transaction);
  await tx.done;
  return transaction;
}

export async function getTransactionsForAccount(
  accountId: string,
): Promise<Transaction[]> {
  const db = await getDB();
  const transactions = await db.getAllFromIndex(
    "transactions",
    "by-account",
    accountId,
  );
  return transactions;
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  const transactions = await db.getAll("transactions");
  return transactions;
}

export async function putTransaction(transaction: Transaction): Promise<void> {
  const db = await getDB();
  await db.put("transactions", transaction);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const db = await getDB();
  await db.delete("transactions", transactionId);
}

export async function importTransactions(
  transactions: Omit<Transaction, "id">[],
): Promise<Transaction[]> {
  const db = await getDB();
  const tx = db.transaction("transactions", "readwrite");
  const store = tx.store;
  const existingTransactions = await store.getAll();
  let latestCreatedAt = existingTransactions.reduce(
    (latest, transaction) =>
      Math.max(latest, Date.parse(transaction.createdAt ?? "") || 0),
    0,
  );

  const results: Transaction[] = [];
  for (const input of transactions) {
    latestCreatedAt = Math.max(Date.now(), latestCreatedAt + 1);
    const transaction: Transaction = {
      ...input,
      createdAt: new Date(latestCreatedAt).toISOString(),
      id: crypto.randomUUID(),
    };
    await store.add(transaction);
    results.push(transaction);
  }

  await tx.done;
  return results;
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAll("categories");
}

export class CategoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryValidationError";
  }
}

export async function addCategory(
  input: Omit<Category, "id">,
): Promise<Category> {
  if (!HEX_COLOR_REGEX.test(input.color)) {
    throw new CategoryValidationError("Pick a valid color.");
  }
  const db = await getDB();
  const category: Category = { ...input, id: crypto.randomUUID() };
  await db.add("categories", category);
  return category;
}
