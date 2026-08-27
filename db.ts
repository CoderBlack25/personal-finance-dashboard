import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Account, Transaction } from "./types";

const DB_NAME = "finance-dashboard";
const DB_VERSION = 1;

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
}

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null;

function getDB(): Promise<IDBPDatabase<FinanceDB>> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<FinanceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("accounts", { keyPath: "id" });
        const txStore = db.createObjectStore("transactions", { keyPath: "id" });
        txStore.createIndex("by-account", "accountId");
      },
    });
  }
  return dbPromise;
}

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
