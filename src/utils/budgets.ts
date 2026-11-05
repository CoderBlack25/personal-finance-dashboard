import type { Category, CategoryBudget, Transaction } from "@/types/types";

export type BudgetStatus = "under" | "near" | "over" | "zero";

export interface CategoryBudgetProgress extends CategoryBudget {
  categoryName: string;
  spentInCents: number;
  remainingInCents: number;
  percentage: number | null;
  barPercentage: number;
  status: BudgetStatus;
}

export function calculateMonthlyCategorySpending(
  transactions: Transaction[] = [],
  year: number,
  month: number,
): Map<string, number> {
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const spending = new Map<string, number>();

  for (const transaction of transactions) {
    if (
      transaction.categoryId === null ||
      transaction.amountInCents >= 0 ||
      !transaction.date.startsWith(monthPrefix)
    ) {
      continue;
    }

    spending.set(
      transaction.categoryId,
      (spending.get(transaction.categoryId) ?? 0) -
        transaction.amountInCents,
    );
  }
  return spending;
}

export function calculateCategoryBudgetProgress(
  budgets: CategoryBudget[] = [],
  categories: Category[] = [],
  spending: Map<string, number> = new Map(),
): CategoryBudgetProgress[] {
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return budgets.flatMap((budget) => {
    const categoryName = categoryNames.get(budget.categoryId);
    if (!categoryName) return [];

    const spentInCents = spending.get(budget.categoryId) ?? 0;
    const remainingInCents = budget.amountInCents - spentInCents;
    const percentage =
      budget.amountInCents > 0
        ? (spentInCents / budget.amountInCents) * 100
        : null;
    const status: BudgetStatus =
      budget.amountInCents <= 0
        ? spentInCents > 0
          ? "over"
          : "zero"
        : spentInCents >= budget.amountInCents
          ? "over"
          : percentage !== null && percentage >= 80
            ? "near"
            : "under";

    return [
      {
        ...budget,
        categoryName,
        spentInCents,
        remainingInCents,
        percentage,
        barPercentage:
          percentage === null ? (spentInCents > 0 ? 100 : 0) : Math.min(100, percentage),
        status,
      },
    ];
  });
}
