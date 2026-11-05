import { describe, expect, it } from "vitest";
import type { Category, CategoryBudget, Transaction } from "@/types/types";
import {
  calculateCategoryBudgetProgress,
  calculateMonthlyCategorySpending,
} from "@/utils/budgets";

const category: Category = { id: "food", name: "Food" };

function transaction(
  id: string,
  amountInCents: number,
  date: string,
  categoryId: string | null = "food",
): Transaction {
  return {
    id,
    accountId: "account-1",
    categoryId,
    amountInCents,
    date,
    description: id,
  };
}

describe("calculateMonthlyCategorySpending", () => {
  it("counts only expenses in the selected month and ignores income and uncategorized transactions", () => {
    const spending = calculateMonthlyCategorySpending(
      [
        transaction("food-1", -2500, "2026-08-01"),
        transaction("food-2", -1000, "2026-08-30"),
        transaction("income", 50_000, "2026-08-15"),
        transaction("next-month", -7000, "2026-09-01"),
        transaction("uncategorized", -2000, "2026-08-20", null),
      ],
      2026,
      8,
    );

    expect(spending).toEqual(new Map([["food", 3500]]));
  });

  it("returns no spending for an empty transaction list", () => {
    expect(calculateMonthlyCategorySpending([], 2026, 8)).toEqual(new Map());
  });
});

describe("calculateCategoryBudgetProgress", () => {
  const budgets: CategoryBudget[] = [
    { categoryId: "food", amountInCents: 10_000 },
    { categoryId: "transport", amountInCents: 5000 },
  ];

  it("handles no transactions and computes remaining budget", () => {
    const [food] = calculateCategoryBudgetProgress(
      [budgets[0]],
      [category],
      new Map(),
    );
    expect(food).toMatchObject({
      spentInCents: 0,
      remainingInCents: 10_000,
      percentage: 0,
      barPercentage: 0,
      status: "under",
    });
  });

  it("marks budgets at 80 percent as near the limit", () => {
    const [food] = calculateCategoryBudgetProgress(
      [budgets[0]],
      [category],
      new Map([["food", 8000]]),
    );
    expect(food).toMatchObject({
      percentage: 80,
      remainingInCents: 2000,
      status: "near",
    });
  });

  it("caps the bar while retaining actual overage and percentage", () => {
    const [food] = calculateCategoryBudgetProgress(
      [budgets[0]],
      [category],
      new Map([["food", 12_500]]),
    );
    expect(food).toMatchObject({
      percentage: 125,
      barPercentage: 100,
      remainingInCents: -2500,
      status: "over",
    });
  });

  it("handles a zero budget without dividing by zero", () => {
    const [unused, spent] = calculateCategoryBudgetProgress(
      [
        { categoryId: "food", amountInCents: 0 },
        { categoryId: "transport", amountInCents: 0 },
      ],
      [category, { id: "transport", name: "Transport" }],
      new Map([
        ["food", 0],
        ["transport", 100],
      ]),
    );
    expect(unused).toMatchObject({
      percentage: null,
      barPercentage: 0,
      status: "zero",
    });
    expect(spent).toMatchObject({
      percentage: null,
      barPercentage: 100,
      remainingInCents: -100,
      status: "over",
    });
  });

  it("does not return progress for budgets whose category was deleted", () => {
    expect(
      calculateCategoryBudgetProgress(
        [{ categoryId: "deleted", amountInCents: 1000 }],
        [category],
      ),
    ).toEqual([]);
  });
});
