/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "@/App";
import { useFinanceStore } from "@/store/store";
import {
  useAccounts,
  useAllTransactions,
  useCategories,
} from "@/hooks/useFinanceData";

vi.mock("../components/accounts/AccountForm", () => ({
  AccountForm: () => <div>AccountForm stub</div>,
}));
vi.mock("../components/transactions/TransactionForm", () => ({
  TransactionForm: () => <div>TransactionForm stub</div>,
}));

vi.mock("@/store/store", () => {
  const useFinanceStore = vi.fn() as any;
  return { useFinanceStore };
});

vi.mock("@/hooks/useFinanceData", () => ({
  useAccounts: vi.fn(),
  useAllTransactions: vi.fn(),
  useCategories: vi.fn(),
}));

describe("App", () => {
  const mockLoadAccounts = vi.fn();

  beforeEach(() => {
    mockLoadAccounts.mockReset();
  });

  function mockState(
    overrides: Partial<{ accounts: any[]; selectedAccountId: string | null }>,
  ) {
    const accounts = overrides.accounts ?? [];
    vi.mocked(useAccounts).mockReturnValue({
      data: { accounts, archivedAccounts: [] },
      isLoading: false,
      error: null,
    });
    vi.mocked(useAllTransactions).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    vi.mocked(useCategories).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        loadAccounts: mockLoadAccounts,
        selectedAccountId: null,
        activeView: "transactions",
        transactionFilters: {
          searchQuery: "",
          dateFrom: "",
          dateTo: "",
          accountId: "",
          categoryId: null,
        },
        updateTransactionFilters: vi.fn(),
        resetTransactionFilters: vi.fn(),
        setActiveView: vi.fn(),
        ...overrides,
      }),
    );
  }

  it("shows a loading state before loadAccounts resolves", () => {
    mockLoadAccounts.mockReturnValue(new Promise(() => {}));
    mockState({});

    render(<App />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText("AccountForm stub")).not.toBeInTheDocument();
  });

  it("shows transaction entry without the account setup form after setup", async () => {
    mockLoadAccounts.mockResolvedValue(undefined);
    mockState({
      accounts: [{ id: "acc_1", name: "Checking", type: "checking" }],
      selectedAccountId: "acc_1",
    });

    render(<App />);

    expect(await screen.findByText("TransactionForm stub")).toBeInTheDocument();
    expect(screen.queryByText("AccountForm stub")).not.toBeInTheDocument();
  });

  it("shows the selected account name in the transaction workflow", async () => {
    mockLoadAccounts.mockResolvedValue(undefined);
    mockState({
      accounts: [{ id: "acc_1", name: "Chase Checking", type: "checking" }],
      selectedAccountId: "acc_1",
    });

    render(<App />);

    expect(
      await screen.findByText(
        /currently adding transactions to: chase checking/i,
      ),
    ).toBeInTheDocument();
  });

  it("opens account creation from the sidebar after setup", async () => {
    mockLoadAccounts.mockResolvedValue(undefined);
    mockState({
      accounts: [{ id: "acc_1", name: "Checking", type: "checking" }],
      selectedAccountId: "acc_1",
    });

    render(<App />);

    await screen.findByText("TransactionForm stub");
    await userEvent.setup().click(
      screen.getByRole("button", { name: "Add account" }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("AccountForm stub")).toBeInTheDocument();
  });

  it("guides a first-time user to create their first account", async () => {
    mockLoadAccounts.mockResolvedValue(undefined);
    mockState({});

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: /let’s set up your finances/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("AccountForm stub")).toBeInTheDocument();
    expect(screen.queryByText("TransactionForm stub")).not.toBeInTheDocument();
  });

  it("shows an error if loading accounts unexpectedly rejects", async () => {
    mockLoadAccounts.mockRejectedValue(new Error("boom"));
    mockState({
      accounts: [{ id: "acc_1", name: "Checking", type: "checking" }],
      selectedAccountId: "acc_1",
    });

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not load your accounts/i,
    );
  });
});
