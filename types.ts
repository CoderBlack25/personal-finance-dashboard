export type AccountType = "checking" | "savings" | "credit" | "cash";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string | null;
  amountInCents: number;
  date: string;
  description: string;
};
