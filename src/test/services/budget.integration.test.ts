import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addCategory,
  deleteCategory,
  deleteCategoryBudget,
  getCategoryBudgets,
  setCategoryBudget,
} from "@/services/db";

describe("category budget persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists budget changes and removes the budget when its category is deleted", async () => {
    const category = await addCategory({ name: "Dining" });
    const budget = { categoryId: category.id, amountInCents: 25_000 };

    await setCategoryBudget(budget);
    expect(await getCategoryBudgets()).toContainEqual(budget);

    await setCategoryBudget({ ...budget, amountInCents: 30_000 });
    expect(await getCategoryBudgets()).toContainEqual({
      ...budget,
      amountInCents: 30_000,
    });

    await deleteCategoryBudget(category.id);
    expect(await getCategoryBudgets()).not.toContainEqual(budget);
    await setCategoryBudget(budget);

    await deleteCategory(category.id);
    expect(await getCategoryBudgets()).not.toContainEqual(
      expect.objectContaining({ categoryId: category.id }),
    );
  });

  it("rejects zero, negative, and non-integer-cent budgets at the persistence layer", async () => {
    await expect(
      setCategoryBudget({ categoryId: "food", amountInCents: 0 }),
    ).rejects.toThrow(/positive amount/i);
    await expect(
      setCategoryBudget({ categoryId: "food", amountInCents: -100 }),
    ).rejects.toThrow(/positive amount/i);
    await expect(
      setCategoryBudget({ categoryId: "food", amountInCents: 10.5 }),
    ).rejects.toThrow(/positive amount/i);
  });
});
