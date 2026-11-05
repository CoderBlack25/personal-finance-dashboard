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
};

export type CategoryBudget = {
  categoryId: string;
  amountInCents: number;
};

export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string | null;
  amountInCents: number;
  date: string;
  description: string;
  createdAt?: string;
};
