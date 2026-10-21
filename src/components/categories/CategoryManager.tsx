import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFinanceStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/schemas/categorySchema";
import { isDuplicateCategoryName } from "@/utils/derived";

const PRESET_COLORS = [
  "#14b8a6",
  "#22c55e",
  "#f97316",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#94a3b8",
] as const;

export function CategoryManager() {
  const categories = useFinanceStore((state) => state.categories);
  const createCategory = useFinanceStore((state) => state.createCategory);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", color: PRESET_COLORS[0] },
  });

  const selectedColor = watch("color");
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
    const failure = await createCategory({
      name: values.name.trim(),
      color: values.color,
    });

    if (failure) {
      setSubmitError(failure);
      return;
    }

    reset({ name: "", color: PRESET_COLORS[0] });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4">Your categories</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet. Add your first one below.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
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

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground mb-1">
              Color
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("color", color)}
                  aria-label={`Use color ${color}`}
                  aria-pressed={selectedColor === color}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    selectedColor === color
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                aria-label="Custom color"
                value={selectedColor}
                onChange={(event) => setValue("color", event.target.value)}
                className="w-8 h-8 p-0 border border-border rounded-full bg-transparent cursor-pointer"
              />
            </div>
          </fieldset>

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
