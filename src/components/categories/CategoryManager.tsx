import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinanceStore } from "@/store/store";
import { useCategories } from "@/hooks/useFinanceData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/schemas/categorySchema";
import { isDuplicateCategoryName } from "@/utils/derived";

export function CategoryManager() {
  const { data: categories, error: categoriesError } = useCategories();
  const createCategory = useFinanceStore((state) => state.createCategory);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Your categories</h2>
        {categoriesError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {categoriesError}
          </p>
        )}
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet. Add your first one below.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground"
              >
                {category.name}
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
    </div>
  );
}
