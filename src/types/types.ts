export type AccountType = "checking" | "savings" | "credit" | "cash";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  archived: boolean;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type TransactionStatus = "posted" | "void";

export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string | null;
  amountInCents: number;
  date: string;
  description: string;
  status?: TransactionStatus;
  voidedAt?: string;
  voidReason?: string;
  reversesId?: string | null;
  batchId?: string | null;
};
