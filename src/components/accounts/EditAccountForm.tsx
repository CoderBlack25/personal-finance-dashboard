import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinanceStore } from "@/store/store";
import type { Account } from "@/types/types";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  accountFormSchema,
  type AccountFormValues,
} from "@/schemas/accountSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface EditAccountFormProps {
  account: Account;
  onDone: () => void;
}

export function EditAccountForm({ account, onDone }: EditAccountFormProps) {
  const updateAccount = useFinanceStore((state) => state.updateAccount);
  const storeError = useFinanceStore((state) => state.error);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account.name,
      type: account.type,
    },
  });

  const onSubmit = async (values: AccountFormValues) => {
    const error = await updateAccount({
      ...account,
      name: values.name.trim(),
      type: values.type,
    });
    if (!error) {
      onDone();
    }
  };

  return (
    <form
      className="flex flex-col gap-4 mt-2"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="edit-account-name"
            className="text-sm font-medium text-foreground"
          >
            Account name
          </label>
          <Input
            id="edit-account-name"
            type="text"
            placeholder="e.g Jude checking"
            aria-invalid={!!errors.name}
            aria-describedby={
              errors.name ? "edit-account-name-error" : undefined
            }
            variant={errors.name ? "error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p
              id="edit-account-name-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="edit-account-type"
            className="text-sm font-medium text-foreground"
          >
            Account type
          </label>
          <Select id="edit-account-type" {...register("type")}>
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

