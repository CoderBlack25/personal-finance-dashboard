/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TransactionList } from "../components/TransactionList";
import { formatCents } from "../../formatCents";
import { useFinanceStore } from "../../store";

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
    expect(formatCents(cents)).toBe(expected);
  });
});

vi.mock("../../store", () => {
  const useFinanceStore = vi.fn() as any;
  return { useFinanceStore };
});

function mockState(state: {
  selectedAccountId: string | null;
  transactions: any[];
}) {
  vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
    selector(state),
  );
}

describe("TransactionList", () => {
  it("prompts to add an account when none is selected", () => {
    mockState({ selectedAccountId: null, transactions: [] });
    render(<TransactionList />);
    expect(
      screen.getByText(/add account to see your transactions here/i),
    ).toBeInTheDocument();
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
          amountInCents: -4250,
          date: "2026-08-01",
          description: "Coffee",
        },
        {
          id: "tx_2",
          accountId: "acc_1",
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
    expect(within(coffeeRow).getByText("-$42.50")).toBeInTheDocument();

    const paycheckRow = screen.getByText("Paycheck").closest("tr")!;
    expect(within(paycheckRow).getByText("+$1,200.00")).toBeInTheDocument();
  });

  it("sorts by date descending regardless of insertion order", () => {
    mockState({
      selectedAccountId: "acc_1",
      transactions: [
        {
          id: "tx_1",
          accountId: "acc_1",
          amountInCents: -100,
          date: "2026-08-01",
          description: "Oldest",
        },
        {
          id: "tx_2",
          accountId: "acc_1",
          amountInCents: -100,
          date: "2026-08-10",
          description: "Newest",
        },
        {
          id: "tx_3",
          accountId: "acc_1",
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
});
