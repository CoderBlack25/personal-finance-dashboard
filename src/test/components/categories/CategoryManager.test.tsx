/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { useFinanceStore } from "@/store/store";
import { useAllTransactions, useCategories } from "@/hooks/useFinanceData";

vi.mock("@/store/store", () => {
  const useFinanceStore = vi.fn() as any;
  useFinanceStore.getState = vi.fn();
  return { useFinanceStore };
});

vi.mock("@/hooks/useFinanceData", () => ({
  useAllTransactions: vi.fn(),
  useCategories: vi.fn(),
}));

describe("CategoryManager", () => {
  const mockCreateCategory = vi.fn();
  const mockUpdateCategory = vi.fn();
  const mockDeleteCategory = vi.fn();

  function mockState(
    overrides: Partial<{
      categories: any[];
      transactions: any[];
      error: string | null;
    }> = {},
  ) {
    vi.mocked(useCategories).mockReturnValue({
      data: overrides.categories ?? [],
      isLoading: false,
      error: null,
    });
    vi.mocked(useAllTransactions).mockReturnValue({
      data: overrides.transactions ?? [],
      isLoading: false,
      error: null,
    });
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        createCategory: mockCreateCategory,
        updateCategory: mockUpdateCategory,
        deleteCategory: mockDeleteCategory,
        error: null,
        ...overrides,
      }),
    );
  }

  beforeEach(() => {
    mockCreateCategory.mockReset();
    mockUpdateCategory.mockReset();
    mockDeleteCategory.mockReset();
    mockCreateCategory.mockResolvedValue(null);
    mockUpdateCategory.mockResolvedValue(null);
    mockDeleteCategory.mockResolvedValue(null);
    mockState();
  });

  it("lists existing categories", () => {
    mockState({
      categories: [
        { id: "cat-1", name: "Groceries" },
        { id: "cat-2", name: "Coffee" },
      ],
    });

    render(<CategoryManager />);

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Coffee")).toBeInTheDocument();
  });

  it("shows an empty state when there are no categories", () => {
    render(<CategoryManager />);
    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("rejects an empty name", async () => {
    const user = userEvent.setup();
    render(<CategoryManager />);

    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(
      await screen.findByText(/give this category a name/i),
    ).toBeInTheDocument();
    expect(mockCreateCategory).not.toHaveBeenCalled();
  });

  it("creates a category with the entered name", async () => {
    const user = userEvent.setup();
    render(<CategoryManager />);

    await user.type(screen.getByLabelText(/category name/i), "Coffee");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() =>
      expect(mockCreateCategory).toHaveBeenCalledWith({ name: "Coffee" }),
    );
  });

  it("clears the form after a successful creation", async () => {
    const user = userEvent.setup();
    render(<CategoryManager />);

    const nameInput = screen.getByLabelText(/category name/i);
    await user.type(nameInput, "Coffee");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() => expect(nameInput).toHaveValue(""));
  });

  it("blocks a duplicate category name regardless of case", async () => {
    const user = userEvent.setup();
    mockState({
      categories: [{ id: "cat-1", name: "Groceries" }],
    });
    render(<CategoryManager />);

    await user.type(screen.getByLabelText(/category name/i), "groceries");

    expect(
      await screen.findByText(/already exists/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add category/i }),
    ).toBeDisabled();
    expect(mockCreateCategory).not.toHaveBeenCalled();
  });

  it("shows the error returned when creation fails", async () => {
    const user = userEvent.setup();
    mockCreateCategory.mockResolvedValue("Could not create category.");
    render(<CategoryManager />);

    await user.type(screen.getByLabelText(/category name/i), "Coffee");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(
      await screen.findByText("Could not create category."),
    ).toBeInTheDocument();
  });

  it("does not show an unrelated store error", () => {
    mockState({ error: "Could not save transaction." });
    render(<CategoryManager />);

    expect(screen.queryByText("Could not save transaction.")).toBeNull();
  });

  it("renames a category and blocks a duplicate name", async () => {
    const user = userEvent.setup();
    mockState({
      categories: [
        { id: "cat-1", name: "Groceries" },
        { id: "cat-2", name: "Dining" },
      ],
    });
    render(<CategoryManager />);

    await user.click(screen.getByRole("button", { name: "Rename Groceries" }));
    const renameInput = screen.getByLabelText("Rename Groceries");
    await user.clear(renameInput);
    await user.type(renameInput, "DINING");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(mockUpdateCategory).not.toHaveBeenCalled();

    await user.clear(renameInput);
    await user.type(renameInput, "Food");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockUpdateCategory).toHaveBeenCalledWith({
        id: "cat-1",
        name: "Food",
      }),
    );
  });

  it("confirms linked transactions become uncategorized when deleting", async () => {
    const user = userEvent.setup();
    mockState({
      categories: [{ id: "cat-1", name: "Groceries" }],
      transactions: [
        { id: "tx-1", categoryId: "cat-1" },
        { id: "tx-2", categoryId: "cat-1" },
        { id: "tx-3", categoryId: null },
      ],
    });
    render(<CategoryManager />);

    await user.click(screen.getByRole("button", { name: "Delete Groceries" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/assigned to 2 transaction\(s\)/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/leave those transactions uncategorized/i),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Delete category" }),
    );

    await waitFor(() =>
      expect(mockDeleteCategory).toHaveBeenCalledWith("cat-1"),
    );
  });

  it("keeps the delete dialog open and displays an error on failure", async () => {
    const user = userEvent.setup();
    mockDeleteCategory.mockResolvedValue("Could not delete category.");
    mockState({ categories: [{ id: "cat-1", name: "Groceries" }] });
    render(<CategoryManager />);

    await user.click(screen.getByRole("button", { name: "Delete Groceries" }));
    await user.click(screen.getByRole("button", { name: "Delete category" }));

    expect(
      await screen.findByText("Could not delete category."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
