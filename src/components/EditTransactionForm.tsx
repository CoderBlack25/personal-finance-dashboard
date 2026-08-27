import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinanceStore } from "../../store";
import { dollarsStringToCents, splitAbsoluteCents } from "../../money";
import {
  type TransactionFormValues,
  transactionFormSchema,
} from "../../transactionSchema";
import type { Transaction } from "../../types";

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
    });
    if (!useFinanceStore.getState().error) {
      onDone();
    }
  };

  return (
    <form className="bg-red-500" onSubmit={handleSubmit(onSubmit)} noValidate>
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
        <label htmlFor="edit-transaction-amount">Amount</label>
        <input
          id="edit-transaction-amount"
          type="text"
          inputMode="decimal"
          aria-invalid={!!errors.amount}
          aria-describedby={
            errors.amount ? "edit-transaction-amount-error" : undefined
          }
          {...register("amount")}
        />
        {errors.amount && (
          <p id="edit-transaction-amount-error" role="alert">
            {errors.amount.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="edit-transaction-date">Date</label>
        <input
          id="edit-transaction-date"
          type="date"
          aria-invalid={!!errors.date}
          aria-describedby={
            errors.date ? "edit-transaction-date-error" : undefined
          }
          {...register("date")}
        />
        {errors.date && (
          <p id="edit-transaction-date-error" role="alert">
            {errors.date.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="edit-transaction-description">Description</label>
        <input
          id="edit-transaction-description"
          type="text"
          aria-invalid={!!errors.description}
          aria-describedby={
            errors.description
              ? "edit-transaction-description-error"
              : undefined
          }
          {...register("description")}
        />
        {errors.description && (
          <p id="edit-transaction-description-error" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {storeError && <p role="alert">{storeError}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save changes"}
      </button>
      <button type="button" onClick={onDone}>
        Cancel
      </button>
    </form>
  );
}
