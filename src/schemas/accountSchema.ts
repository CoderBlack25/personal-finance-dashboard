import { z } from "zod";

export const ACCOUNT_TYPES = ["checking", "savings", "credit", "cash"] as const;

export const ACCOUNT_TYPE_LABELS: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit card",
  cash: "Cash",
};

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Give this account a name."),
  type: z.enum(ACCOUNT_TYPES),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

