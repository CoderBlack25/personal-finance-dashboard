import { useForm } from "react-hook-form";
import { useFinanceStore } from "@/store/store";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { X } from "lucide-react";

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

interface AccountFormProps {
  onClose?: () => void;
}

export function AccountForm({ onClose }: AccountFormProps) {
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
      onClose?.();
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Add account</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            reset();
            onClose?.();
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="account-name"
            className="text-sm font-medium text-foreground"
          >
            Account name
          </label>
          <Input
            id="account-name"
            type="text"
            placeholder="e.g Jude checking"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "account-name-error" : undefined}
            variant={errors.name ? "error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p
              id="account-name-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="account-type"
            className="text-sm font-medium text-foreground"
          >
            Account type
          </label>
          <Select id="account-type" {...register("type")}>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {ACCOUNT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>

        {storeError && (
          <p role="alert" className="text-sm text-destructive">
            {storeError}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add account"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onClose?.();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
