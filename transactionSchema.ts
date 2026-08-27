import { z } from "zod";

export const transactionFormSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount.")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount, like 42 or 42.50.")
    .refine((val) => Number(val) > 0, "Amount must be more than zero."),
  date: z.string().min(1, "Pick a date."),
  description: z.string().trim().min(1, "Add a short description."),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
