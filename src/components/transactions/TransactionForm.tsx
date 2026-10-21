import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type TransactionFormValues,
  transactionFormSchema,
} from "@/schemas/transactionSchema";
import { format } from "date-fns";
import { useFinanceStore } from "@/store/store";
import { dollarsStringToCents } from "@/utils/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";

function getDefaultFormValues(): TransactionFormValues {
  return {
    type: "expense",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    categoryId: null,
  };
}

export function TransactionForm() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const createTransaction = useFinanceStore((state) => state.createTransaction);
  const categories = useFinanceStore((state) => state.categories);
  const storeError = useFinanceStore((state) => state.error);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: getDefaultFormValues(),
  });

  if (!selectedAccountId) {
    return (
      <p className="text-sm text-muted-foreground">
        Add an account first to start logging transactions.
      </p>
    );
  }

  const onSubmit = async (values: TransactionFormValues) => {
    const cents = dollarsStringToCents(values.amount);
    await createTransaction({
      accountId: selectedAccountId,
      amountInCents: values.type === "expense" ? -cents : cents,
      date: values.date,
      description: values.description,
      categoryId: values.categoryId,
    });
    if (!useFinanceStore.getState().error) {
      reset(getDefaultFormValues());
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Add transaction</h2>

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
              htmlFor="transaction-amount"
              className="text-sm font-medium text-foreground"
            >
              Amount
            </label>
            <Input
              id="transaction-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={!!errors.amount}
              aria-describedby={
                errors.amount ? "transaction-amount-error" : undefined
              }
              variant={errors.amount ? "error" : undefined}
              {...register("amount")}
            />
            {errors.amount && (
              <p
                id="transaction-amount-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="transaction-date"
              className="text-sm font-medium text-foreground"
            >
              Date
            </label>
            <Input
              id="transaction-date"
              type="date"
              aria-invalid={!!errors.date}
              aria-describedby={
                errors.date ? "transaction-date-error" : undefined
              }
              variant={errors.date ? "error" : undefined}
              {...register("date")}
            />
            {errors.date && (
              <p
                id="transaction-date-error"
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
            htmlFor="transaction-description"
            className="text-sm font-medium text-foreground"
          >
            Description
          </label>
          <Input
            id="transaction-description"
            type="text"
            placeholder="e.g. Groceries"
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? "transaction-description-error" : undefined
            }
            variant={errors.description ? "error" : undefined}
            {...register("description")}
          />
          {errors.description && (
            <p
              id="transaction-description-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="transaction-category"
            className="text-sm font-medium text-foreground"
          >
            Category
          </label>
          <Select id="transaction-category" {...register("categoryId")}>
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
            {isSubmitting ? "Adding..." : "Add transaction"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
