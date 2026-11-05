import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addCategory,
  addTransaction,
  deleteCategory,
  getAllTransactions,
  getCategories,
  updateCategory,
} from "@/services/db";

describe("category persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renames categories and uncategorizes linked transactions on deletion", async () => {
    const category = await addCategory({ name: "Old name" });
    const transaction = await addTransaction({
      accountId: "test-account",
      categoryId: category.id,
      amountInCents: -1234,
      date: "2026-08-01",
      description: "Test purchase",
    });

    await updateCategory({ ...category, name: "New name" });

    expect(await getCategories()).toContainEqual({
      id: category.id,
      name: "New name",
    });

    await deleteCategory(category.id);

    expect(await getCategories()).not.toContainEqual(
      expect.objectContaining({ id: category.id }),
    );
    expect(await getAllTransactions()).toContainEqual({
      ...transaction,
      categoryId: null,
    });
  });
});
