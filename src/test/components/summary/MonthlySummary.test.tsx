/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MonthlySummary } from "@/components/summary/MonthlySummary";
import {
  useAccounts,
  useAllTransactions,
  useCategories,
} from "@/hooks/useFinanceData";
import { useFinanceStore } from "@/store/store";

vi.mock("@/hooks/useFinanceData", () => ({
  useAccounts: vi.fn(),
  useAllTransactions: vi.fn(),
  useCategories: vi.fn(),
}));

vi.mock("@/store/store", () => ({
  useFinanceStore: vi.fn(),
}));

describe("MonthlySummary", () => {
  beforeEach(() => {
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
          id: "transaction-1",
          accountId: "account-1",
          categoryId: "category-groceries",
          amountInCents: -2500,
          date: "2026-08-03",
          description: "Groceries",
        },
      ],
      isLoading: false,
      error: null,
    });
    vi.mocked(useCategories).mockReturnValue({
      data: [{ id: "category-groceries", name: "Groceries" }],
      isLoading: false,
      error: null,
    });
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        summaryFilters: { year: 2026, month: 8 },
        updateSummaryFilters: vi.fn(),
      }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("provides a toggleable text table alternative to the chart", async () => {
    const user = userEvent.setup();
    render(<MonthlySummary />);

    expect(
      screen.getByLabelText("Income and spending by category chart"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", {
        name: "Income and spending by category data table",
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show data table" }));

    const table = screen.getByRole("table", {
      name: "Income and spending by category data table",
    });
    const groceriesRow = within(table).getByRole("row", { name: /groceries/i });
    expect(within(groceriesRow).getByText("-$25.00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide data table" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Hide data table" }));
    expect(
      screen.queryByRole("table", {
        name: "Income and spending by category data table",
      }),
    ).not.toBeInTheDocument();
  });
});
