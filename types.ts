export type AccountType = "checking" | "savings" | "credit" | "cash";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
};

export type Transaction = {
  id: string;
  accountId: string;
  amountInCents: number;
  date: string;
  description: string;
};
