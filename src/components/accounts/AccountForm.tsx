import { useForm } from "react-hook-form";
import { useFinanceStore } from "../../store/store";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const ACCOUNT_TYPES = ["checking", "savings", "credit", "cash"] as const;

const ACCOUNT_TYPE_LABELS: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit card",
  cash: "Cash",
};

const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Give this account a name."),
  type: z.enum(ACCOUNT_TYPES),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const createAccount = useFinanceStore((state) => state.createAccount);
  const storeError = useFinanceStore((state) => state.error);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: "", type: "checking" },
  });

  const onSubmit = async (value: AccountFormValues) => {
    await createAccount(value);

    if (!useFinanceStore.getState().error) {
      reset();
    }
  };

  return (
    <form className="bg-amber-300" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2>Add account</h2>

      <div>
        <label htmlFor="account-name">Account name</label>
        <input
          id="account-name"
          type="text"
          placeholder="e.g Jude checking"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "account-name-error" : undefined}
          {...register("name")}
        />
        {errors.name && (
          <p id="account-name-error" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="account-type">Account type</label>
        <select id="account-type" {...register("type")}>
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACCOUNT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {storeError && <p role="alert">{storeError}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add account"}
      </button>
    </form>
  );
}
