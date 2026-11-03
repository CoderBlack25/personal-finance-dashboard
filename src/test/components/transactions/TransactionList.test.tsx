/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TransactionList } from "@/components/transactions/TransactionList";
import { formatCentsToDollar } from "@/utils/money";
import { useFinanceStore } from "@/store/store";

describe("formatCents", () => {
  it.each([
    [4250, "+$42.50"],
    [-4250, "-$42.50"],
    [120000, "+$1,200.00"],
    [5, "+$0.05"],
    [-5, "-$0.05"],
    [0, "+$0.00"],
    [100, "+$1.00"],
  ])("formats %i cents as %s", (cents, expected) => {
    expect(formatCentsToDollar(cents, { alwaysShowSign: true })).toBe(expected);
  });
});

vi.mock("@/store/store", () => {
  const useFinanceStore = vi.fn() as any;
  return { useFinanceStore };
});

function mockState(state: {
  selectedAccountId: string | null;
  transactions: any[];
  categories?: any[];
}) {
  vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
    selector({ categories: [], ...state }),
  );
}

describe("TransactionList", () => {
  it("prompts to add an account when none is selected", () => {
    mockState({ selectedAccountId: null, transactions: [] });
    render(<TransactionList />);
   expect(screen.getByText(/no account selected/i)).toBeInTheDocument();
  });

  it("shows an empty state when an account is selected but has no transactions", () => {
    mockState({ selectedAccountId: "acc_1", transactions: [] });
    render(<TransactionList />);
    expect(screen.getByText(/no transactions logged yet/i)).toBeInTheDocument();
  });

  it("renders one row per transaction with formatted amounts", () => {
    mockState({
      selectedAccountId: "acc_1",
      transactions: [
        {
          id: "tx_1",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: -4250,
          date: "2026-08-01",
          description: "Coffee",
        },
        {
          id: "tx_2",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: 120000,
          date: "2026-08-05",
          description: "Paycheck",
        },
      ],
    });
    render(<TransactionList />);

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);

    const coffeeRow = screen.getByText("Coffee").closest("tr")!;
    expect(within(coffeeRow).getAllByText("-$42.50")).toHaveLength(2);

    const paycheckRow = screen.getByText("Paycheck").closest("tr")!;
    expect(within(paycheckRow).getByText("+$1,200.00")).toBeInTheDocument();
    expect(within(paycheckRow).getByText("+$1,157.50")).toBeInTheDocument();
  });

  it("sorts by date descending regardless of insertion order", () => {
    mockState({
      selectedAccountId: "acc_1",
      transactions: [
        {
          id: "tx_1",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: -100,
          date: "2026-08-01",
          description: "Oldest",
        },
        {
          id: "tx_2",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: -100,
          date: "2026-08-10",
          description: "Newest",
        },
        {
          id: "tx_3",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: -100,
          date: "2026-08-05",
          description: "Middle",
        },
      ],
    });
    render(<TransactionList />);

    const dataRows = screen.getAllByRole("row").slice(1);
    const descriptionsInOrder = dataRows.map(
      (row) => within(row).getAllByRole("cell")[1].textContent,
    );
    expect(descriptionsInOrder).toEqual(["Newest", "Middle", "Oldest"]);
  });

  it("shows same-day transactions newest-first with balances from entry order", () => {
    mockState({
      selectedAccountId: "acc_1",
      transactions: [
        {
          id: "tx_late",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: -2500,
          date: "2026-08-05",
          createdAt: "2026-08-05T12:00:00.000Z",
          description: "Later Expense",
        },
        {
          id: "tx_early",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: 10000,
          date: "2026-08-05",
          createdAt: "2026-08-05T09:00:00.000Z",
          description: "Earlier Deposit",
        },
      ],
    });
    render(<TransactionList />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[1].textContent))
      .toEqual(["Later Expense", "Earlier Deposit"]);
    expect(within(rows[0]).getAllByRole("cell")[3]).toHaveTextContent(
      "+$75.00",
    );
    expect(within(rows[1]).getAllByRole("cell")[3]).toHaveTextContent(
      "+$100.00",
    );
  });

  it("shows the edit form when a transaction's edit button is clicked", async () => {
    mockState({
      selectedAccountId: "acc_1",
      transactions: [
        {
          id: "tx_1",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: -4250,
          date: "2026-08-01",
          description: "Coffee",
        },
      ],
    });
    render(<TransactionList />);

    const user = userEvent.setup();
    const transactionRow = screen.getByText("Coffee").closest("tr")!;
    await user.click(
      within(transactionRow).getByRole("button", { name: /edit/i }),
    );

    expect(screen.getByLabelText(/description/i)).toHaveValue("Coffee");
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  it("renders running balance column showing accumulated balance after each transaction", () => {
    mockState({
      selectedAccountId: "acc_1",
      transactions: [
        {
          id: "tx_1",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: 100000,
          date: "2026-08-01",
          description: "Initial Deposit",
        },
        {
          id: "tx_2",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: -2500,
          date: "2026-08-02",
          description: "Book",
        },
        {
          id: "tx_3",
          accountId: "acc_1",
          categoryId: null,
          amountInCents: -5000,
          date: "2026-08-03",
          description: "Shoes",
        },
      ],
    });
    render(<TransactionList />);
    expect(
      screen.getByRole("columnheader", { name: /balance/i }),
    ).toBeInTheDocument();

    const depositRow = screen.getByText("Initial Deposit").closest("tr")!;
    const bookRow = screen.getByText("Book").closest("tr")!;
    const shoesRow = screen.getByText("Shoes").closest("tr")!;

    // Initial deposit: +$1,000.00 -> balance +$1,000.00
    expect(within(depositRow).getAllByText("+$1,000.00")).toHaveLength(2);

    // Book: -$25.00 -> balance +$975.00
    expect(within(bookRow).getByText("-$25.00")).toBeInTheDocument();
    expect(within(bookRow).getByText("+$975.00")).toBeInTheDocument();

    // Shoes: -$50.00 -> balance +$925.00
    expect(within(shoesRow).getByText("-$50.00")).toBeInTheDocument();
    expect(within(shoesRow).getByText("+$925.00")).toBeInTheDocument();
  });
});
