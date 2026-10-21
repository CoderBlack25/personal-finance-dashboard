/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { useFinanceStore } from "@/store/store";

vi.mock("@/store/store", () => {
  const useFinanceStore = vi.fn() as any;
  useFinanceStore.getState = vi.fn();
  return { useFinanceStore };
});

describe("CategoryManager", () => {
  const mockCreateCategory = vi.fn();

  function mockState(
    overrides: Partial<{ categories: any[]; error: string | null }> = {},
  ) {
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        categories: [],
        createCategory: mockCreateCategory,
        error: null,
        ...overrides,
      }),
    );
  }

  beforeEach(() => {
    mockCreateCategory.mockReset();
    mockCreateCategory.mockResolvedValue(null);
    mockState();
  });

  it("lists existing categories", () => {
    mockState({
      categories: [
        { id: "cat-1", name: "Groceries", color: "#22c55e" },
        { id: "cat-2", name: "Coffee", color: "#f97316" },
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

  it("creates a category with the entered name and default color", async () => {
    const user = userEvent.setup();
    render(<CategoryManager />);

    await user.type(screen.getByLabelText(/category name/i), "Coffee");
    await user.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() =>
      expect(mockCreateCategory).toHaveBeenCalledWith({
        name: "Coffee",
        color: "#14b8a6",
      }),
    );
  });

  it("creates a category with a chosen color", async () => {
    const user = userEvent.setup();
    render(<CategoryManager />);

    await user.type(screen.getByLabelText(/category name/i), "Travel");
    await user.click(screen.getByLabelText("Use color #3b82f6"));
    await user.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() =>
      expect(mockCreateCategory).toHaveBeenCalledWith({
        name: "Travel",
        color: "#3b82f6",
      }),
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
      categories: [{ id: "cat-1", name: "Groceries", color: "#22c55e" }],
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
});
