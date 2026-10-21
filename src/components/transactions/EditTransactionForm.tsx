import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinanceStore } from "@/store/store";
import { dollarsStringToCents, splitAbsoluteCents } from "@/utils/money";
import {
  type TransactionFormValues,
  transactionFormSchema,
} from "@/schemas/transactionSchema";
import type { Transaction } from "@/types/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function transactionToFormValues(
  transaction: Transaction,
): TransactionFormValues {
  const isNegative = transaction.amountInCents < 0;
  const { dollars, cents } = splitAbsoluteCents(
    Math.abs(transaction.amountInCents),
  );
  return {
    type: isNegative ? "expense" : "income",
    amount: `${dollars}.${String(cents).padStart(2, "0")}`,
    date: transaction.date,
    description: transaction.description,
    categoryId: transaction.categoryId,
  };
}

interface EditTransactionFormProps {
  transaction: Transaction;
  onDone: () => void;
}

export function EditTransactionForm({
  transaction,
  onDone,
}: EditTransactionFormProps) {
  const updateTransaction = useFinanceStore((state) => state.updateTransaction);
  const categories = useFinanceStore((state) => state.categories);
  const storeError = useFinanceStore((state) => state.error);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transactionToFormValues(transaction),
  });

  const onSubmit = async (values: TransactionFormValues) => {
    const cents = dollarsStringToCents(values.amount);
    await updateTransaction({
      ...transaction,
      amountInCents: values.type === "expense" ? -cents : cents,
      date: values.date,
      description: values.description,
      categoryId: values.categoryId,
    });
    if (!useFinanceStore.getState().error) {
      onDone();
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Edit transaction</h2>

        <div className="space-y-1">
          <fieldset className="border-none p-0 m-0 flex gap-3">
            <legend className="text-xs font-medium text-muted-foreground w-16 shrink-0">
              Type
            </legend>
            <RadioGroup>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <RadioGroupItem value="expense" {...register("type")} />
                Expense
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <RadioGroupItem value="income" {...register("type")} />
                Income
              </label>
            </RadioGroup>
          </fieldset>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="edit-transaction-amount"
              className="text-sm font-medium text-foreground"
            >
              Amount
            </label>
            <Input
              id="edit-transaction-amount"
              type="text"
              inputMode="decimal"
              aria-invalid={!!errors.amount}
              aria-describedby={
                errors.amount ? "edit-transaction-amount-error" : undefined
              }
              variant={errors.amount ? "error" : undefined}
              {...register("amount")}
            />
            {errors.amount && (
              <p
                id="edit-transaction-amount-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="edit-transaction-date"
              className="text-sm font-medium text-foreground"
            >
              Date
            </label>
            <Input
              id="edit-transaction-date"
              type="date"
              aria-invalid={!!errors.date}
              aria-describedby={
                errors.date ? "edit-transaction-date-error" : undefined
              }
              variant={errors.date ? "error" : undefined}
              {...register("date")}
            />
            {errors.date && (
              <p
                id="edit-transaction-date-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.date.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="edit-transaction-description"
            className="text-sm font-medium text-foreground"
          >
            Description
          </label>
          <Input
            id="edit-transaction-description"
            type="text"
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description
                ? "edit-transaction-description-error"
                : undefined
            }
            variant={errors.description ? "error" : undefined}
            {...register("description")}
          />
          {errors.description && (
            <p
              id="edit-transaction-description-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="edit-transaction-category"
            className="text-sm font-medium text-foreground"
          >
            Category
          </label>
          <Select id="edit-transaction-category" {...register("categoryId")}>
            <option value="">— No category —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        {storeError && (
          <p role="alert" className="text-sm text-destructive">
            {storeError}
          </p>
        )}

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}
