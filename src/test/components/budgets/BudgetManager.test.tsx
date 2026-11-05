/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetManager } from "@/components/budgets/BudgetManager";
import {
  useAccounts,
  useAllTransactions,
  useCategories,
  useCategoryBudgets,
} from "@/hooks/useFinanceData";
import { useFinanceStore } from "@/store/store";

vi.mock("@/hooks/useFinanceData", () => ({
  useAccounts: vi.fn(),
  useAllTransactions: vi.fn(),
  useCategories: vi.fn(),
  useCategoryBudgets: vi.fn(),
}));

vi.mock("@/store/store", () => ({
  useFinanceStore: vi.fn(),
}));

describe("BudgetManager", () => {
  const setCategoryBudget = vi.fn();
  const deleteCategoryBudget = vi.fn();
  const updateSummaryFilters = vi.fn();

  beforeEach(() => {
    setCategoryBudget.mockReset().mockResolvedValue(null);
    deleteCategoryBudget.mockReset().mockResolvedValue(null);
    updateSummaryFilters.mockReset();
    vi.mocked(useAccounts).mockReturnValue({
      data: {
        accounts: [
          {
            id: "account-1",
            name: "Checking",
            type: "checking",
            archived: false,
          },
        ],
        archivedAccounts: [],
      },
      isLoading: false,
      error: null,
    });
    vi.mocked(useAllTransactions).mockReturnValue({
      data: [
        {
          id: "expense",
          accountId: "account-1",
          categoryId: "food",
          amountInCents: -8500,
          date: "2026-08-03",
          description: "Groceries",
        },
        {
          id: "income",
          accountId: "account-1",
          categoryId: "food",
          amountInCents: 5000,
          date: "2026-08-04",
          description: "Refund",
        },
        {
          id: "archived-expense",
          accountId: "archived-account",
          categoryId: "food",
          amountInCents: -25_000,
          date: "2026-08-05",
          description: "Archived account purchase",
        },
      ],
      isLoading: false,
      error: null,
    });
    vi.mocked(useCategories).mockReturnValue({
      data: [{ id: "food", name: "Food" }],
      isLoading: false,
      error: null,
    });
    vi.mocked(useCategoryBudgets).mockReturnValue({
      data: [{ categoryId: "food", amountInCents: 10_000 }],
      isLoading: false,
      error: null,
    });
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        summaryFilters: { year: 2026, month: 8 },
        updateSummaryFilters,
        setCategoryBudget,
        deleteCategoryBudget,
      }),
    );
  });

  it("shows active-month expense spending, remaining, accessible progress, and status", () => {
    render(<BudgetManager />);

    expect(screen.getByText("$85.00")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("Near limit")).toBeInTheDocument();
    expect(screen.getByText("$15.00 remaining · 85.0% spent")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "85",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "85.0% spent",
    );
  });

  it("fills the amount input when stored budgets finish loading", () => {
    vi.mocked(useCategoryBudgets).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });
    const { rerender } = render(<BudgetManager />);
    expect(screen.getByLabelText("Monthly budget")).toHaveValue("");

    vi.mocked(useCategoryBudgets).mockReturnValue({
      data: [{ categoryId: "food", amountInCents: 10_000 }],
      isLoading: false,
      error: null,
    });
    rerender(<BudgetManager />);

    expect(screen.getByLabelText("Monthly budget")).toHaveValue("100.00");
  });

  it("caps the progress bar but reports the actual over-budget amount", () => {
    vi.mocked(useAllTransactions).mockReturnValue({
      data: [
        {
          id: "expense",
          accountId: "account-1",
          categoryId: "food",
          amountInCents: -12_500,
          date: "2026-08-03",
          description: "Groceries",
        },
      ],
      isLoading: false,
      error: null,
    });
    render(<BudgetManager />);

    expect(screen.getByText("Over budget")).toBeInTheDocument();
    expect(screen.getByText(/over budget by \$25.00 · 125.0% of budget/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "125.0% spent",
    );
  });

  it("rejects zero and values with more than two decimal places", async () => {
    const user = userEvent.setup();
    render(<BudgetManager />);
    const input = screen.getByLabelText("Monthly budget");

    await user.clear(input);
    await user.type(input, "0");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/greater than \$0.00/i)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "12.345");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText(/up to two decimal places/i),
    ).toBeInTheDocument();
    expect(setCategoryBudget).not.toHaveBeenCalled();
  });

  it("saves a positive amount and allows removing the budget", async () => {
    const user = userEvent.setup();
    render(<BudgetManager />);
    const input = screen.getByLabelText("Monthly budget");

    await user.clear(input);
    await user.type(input, "125.50");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(setCategoryBudget).toHaveBeenCalledWith({
        categoryId: "food",
        amountInCents: 12_550,
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Budget saved.");

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(deleteCategoryBudget).toHaveBeenCalledWith("food");
  });

  it("switches the shared report month and year", async () => {
    const user = userEvent.setup();
    render(<BudgetManager />);

    await user.selectOptions(screen.getByLabelText("Month"), "9");
    expect(updateSummaryFilters).toHaveBeenCalledWith({ month: 9 });

    await user.clear(screen.getByLabelText("Year"));
    await user.type(screen.getByLabelText("Year"), "2025");
    expect(updateSummaryFilters).toHaveBeenCalledWith({ year: 2025 });
  });
});
