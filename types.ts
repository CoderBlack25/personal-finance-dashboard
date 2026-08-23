export type AccountType = "checking" | "savings" | "credit" | "cash";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
};

export type Transaction = {
  id: string;
  accountId: string; // which Account this belongs to, not a copy of its data
  amountInCents: number;
  date: string; // ISO date, e.g. "2026-08-06", not a Date object
  description: string;
};
