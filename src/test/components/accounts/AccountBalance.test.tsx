/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccountBalance } from "@/components/accounts/AccountBalance";
import { useFinanceStore } from "@/store/store";

vi.mock("@/store/store", () => {
  const useFinanceStore = vi.fn() as any;
  useFinanceStore.getState = vi.fn();
  return { useFinanceStore };
});

describe("AccountBalance", () => {
  function mockState(
    overrides: Partial<{
      selectedAccountId: string | null;
      transactions: any[];
      allTransactions: any[];
    }> = {},
  ) {
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        selectedAccountId: "account-1",
        transactions: [],
        allTransactions: [],
        ...overrides,
      }),
    );
  }

  beforeEach(() => {
    mockState();
  });

  it("renders nothing when no account is selected", () => {
    mockState({ selectedAccountId: null });

    const { container } = render(<AccountBalance />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the balance of the selected account's transactions", () => {
    mockState({
      selectedAccountId: "account-1",
      allTransactions: [
        {
          id: "transaction-1",
          accountId: "account-1",
          categoryId: null,
          description: "Groceries",
          amountInCents: -5000,
          date: "2026-08-28",
        },
        {
          id: "transaction-2",
          accountId: "account-1",
          categoryId: null,
          description: "Paycheck",
          amountInCents: 200000,
          date: "2026-08-29",
        },
      ],
    });

    render(<AccountBalance />);

    expect(screen.getByText("$1,950.00")).toBeInTheDocument();
  });

  it("shows a zero balance when the selected account has no transactions", () => {
    mockState({ selectedAccountId: "account-1", allTransactions: [] });

    render(<AccountBalance />);

    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});
