import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type TransactionFormValues,
  transactionFormSchema,
} from "@/schemas/transactionSchema";
import { format } from "date-fns";
import { useFinanceStore } from "@/store/store";
import { dollarsStringToCents } from "@/utils/money";

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
    return <p>Add an account first to start logging transactions.</p>;
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
    <form className="bg-card border border-border rounded-lg p-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2>Add transaction</h2>

      <fieldset>
        <legend>Type</legend>
        <label>
          <input type="radio" value="expense" {...register("type")} />
          Expense
        </label>
        <label>
          <input type="radio" value="income" {...register("type")} />
          Income
        </label>
      </fieldset>

      <div>
        <label htmlFor="transaction-amount">Amount</label>
        <input
          type="text"
          id="transaction-amount"
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={!!errors.amount}
          aria-describedby={
            errors.amount ? "transaction-amount-error" : undefined
          }
          {...register("amount")}
        />
        {errors.amount && (
          <p id="transaction-amount-error" role="alert">
            {errors.amount.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="transaction-date">Date</label>
        <input
          id="transaction-date"
          type="date"
          aria-invalid={!!errors.date}
          aria-describedby={errors.date ? "transaction-date-error" : undefined}
          {...register("date")}
        />
        {errors.date && (
          <p id="transaction-date-error" role="alert">
            {errors.date.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="transaction-description">Description</label>
        <input
          id="transaction-description"
          type="text"
          placeholder="e.g. Groceries"
          aria-invalid={!!errors.description}
          aria-describedby={
            errors.description ? "transaction-description-error" : undefined
          }
          {...register("description")}
        />
        {errors.description && (
          <p id="transaction-description-error" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="transaction-category">Category</label>
        <select id="transaction-category" {...register("categoryId")}>
          <option value="">— No category —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {storeError && <p role="alert">{storeError}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add transaction"}
      </button>
    </form>
  );
}
