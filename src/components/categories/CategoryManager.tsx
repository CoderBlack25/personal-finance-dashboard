import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinanceStore } from "@/store/store";
import {
  useAllTransactions,
  useCategories,
} from "@/hooks/useFinanceData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/schemas/categorySchema";
import { isDuplicateCategoryName } from "@/utils/derived";
import type { Category } from "@/types/types";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

export function CategoryManager() {
  const { data: categories, error: categoriesError } = useCategories();
  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useAllTransactions();
  const createCategory = useFinanceStore((state) => state.createCategory);
  const updateCategory = useFinanceStore((state) => state.updateCategory);
  const deleteCategory = useFinanceStore((state) => state.deleteCategory);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const nameValue = watch("name");
  const duplicateName =
    nameValue.trim().length > 0 &&
    isDuplicateCategoryName(nameValue, categories);

  const onSubmit = async (values: CategoryFormValues) => {
    if (isDuplicateCategoryName(values.name, categories)) {
      setSubmitError("A category with this name already exists.");
      return;
    }

    setSubmitError(null);
    const failure = await createCategory({ name: values.name.trim() });

    if (failure) {
      setSubmitError(failure);
      return;
    }

    reset({ name: "" });
  };

  const onUpdate = async (category: Category) => {
    const result = categoryFormSchema.safeParse({ name: editName });
    if (!result.success) {
      setEditError(result.error.issues[0]?.message ?? "Enter a category name.");
      return;
    }

    const duplicate = categories.some(
      (existing) =>
        existing.id !== category.id &&
        existing.name.trim().toLowerCase() ===
          result.data.name.trim().toLowerCase(),
    );
    if (duplicate) {
      setEditError("A category with this name already exists.");
      return;
    }

    setEditError(null);
    const failure = await updateCategory({
      ...category,
      name: result.data.name.trim(),
    });
    if (failure) {
      setEditError(failure);
      return;
    }
    setEditingCategory(null);
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const failure = await deleteCategory(pendingDelete.id);
    setDeleting(false);
    if (failure) {
      setDeleteError(failure);
      return;
    }
    setPendingDelete(null);
  };

  const pendingDeleteTransactionCount = pendingDelete
    ? transactions.filter(
        (transaction) => transaction.categoryId === pendingDelete.id,
      ).length
    : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Your categories</h2>
        {categoriesError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {categoriesError}
          </p>
        )}
        {transactionsError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
          {transactionsError} Category deletion is unavailable until transactions load.
          </p>
        )}
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet. Add your first one below.
          </p>
        ) : (
          <ul className="space-y-2">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-2">
                {editingCategory?.id === category.id ? (
                  <div className="flex flex-1 flex-wrap items-start gap-2">
                    <div className="flex-1">
                      <label
                        htmlFor={`edit-category-${category.id}`}
                        className="sr-only"
                      >
                        Rename {category.name}
                      </label>
                      <Input
                        id={`edit-category-${category.id}`}
                        value={editName}
                        onChange={(event) => {
                          setEditName(event.target.value);
                          setEditError(null);
                        }}
                        aria-invalid={Boolean(editError)}
                        aria-describedby={
                          editError
                            ? `edit-category-error-${category.id}`
                            : undefined
                        }
                      />
                      {editError && (
                        <p
                          id={`edit-category-error-${category.id}`}
                          role="alert"
                          className="mt-1 text-xs text-destructive"
                        >
                          {editError}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => void onUpdate(category)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingCategory(null);
                        setEditError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
                      {category.name}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Rename ${category.name}`}
                      onClick={() => {
                        setEditingCategory(category);
                        setEditName(category.name);
                        setEditError(null);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Delete ${category.name}`}
                      disabled={transactionsLoading || Boolean(transactionsError)}
                      onClick={() => {
                        setPendingDelete(category);
                        setDeleteError(null);
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Add category</h2>

        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-1">
            <label
              htmlFor="category-name"
              className="text-sm font-medium text-foreground"
            >
              Category name
            </label>
            <Input
              id="category-name"
              type="text"
              placeholder="e.g. Coffee"
              aria-invalid={!!errors.name || duplicateName}
              aria-describedby={
                errors.name
                  ? "category-name-error"
                  : duplicateName
                    ? "category-name-duplicate"
                    : undefined
              }
              variant={errors.name || duplicateName ? "error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p
                id="category-name-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.name.message}
              </p>
            )}
            {!errors.name && duplicateName && (
              <p
                id="category-name-duplicate"
                role="alert"
                className="text-xs text-destructive"
              >
                A category with this name already exists.
              </p>
            )}
          </div>

          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting || duplicateName}>
              {isSubmitting ? "Adding..." : "Add category"}
            </Button>
          </div>
        </form>
      </Card>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogContent>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              {pendingDeleteTransactionCount === 0
                ? `“${pendingDelete?.name}” will be permanently deleted.`
                : `“${pendingDelete?.name}” is assigned to ${pendingDeleteTransactionCount} transaction(s). Deleting it will leave those transactions uncategorized.`}
            </DialogDescription>
            {deleteError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting || transactionsLoading || Boolean(transactionsError)}
                onClick={() => void onDelete()}
              >
                {deleting ? "Deleting..." : "Delete category"}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
