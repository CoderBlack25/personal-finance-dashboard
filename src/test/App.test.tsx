/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen } from "@testing-library/react";
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
          showVoided: false,
        },
        voidTransaction: vi.fn(),
        updateTransactionFilters: vi.fn(),
        resetTransactionFilters: vi.fn(),
        setActiveView: vi.fn(),
        ...overrides,
      }),
    );
  }

  async function switchToTransactions() {
    await screen.findByRole("button", { name: /transactions/i }).then((btn) => {
      // eslint-disable-next-line @testing-library/dom-events/no-mouse-events
      btn.click();
    });
  }

  it("shows a loading state before loadAccounts resolves", () => {
    mockLoadAccounts.mockReturnValue(new Promise(() => {}));
    mockState({});

    render(<App />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText("AccountForm stub")).not.toBeInTheDocument();
  });

  it("shows the page content once loadAccounts resolves", async () => {
    mockLoadAccounts.mockResolvedValue(undefined);
    mockState({});

    render(<App />);

    await switchToTransactions();
    expect(await screen.findByText("AccountForm stub")).toBeInTheDocument();
    expect(screen.getByText("TransactionForm stub")).toBeInTheDocument();
  });

  it("shows the selected account's name once one exists", async () => {
    mockLoadAccounts.mockResolvedValue(undefined);
    mockState({
      accounts: [{ id: "acc_1", name: "Chase Checking", type: "checking" }],
      selectedAccountId: "acc_1",
    });

    render(<App />);

    await switchToTransactions();

    expect(
      await screen.findByText(
        /currently adding transactions to: chase checking/i,
      ),
    ).toBeInTheDocument();
  });

  it("says no account is selected when the list is empty", async () => {
    mockLoadAccounts.mockResolvedValue(undefined);
    mockState({});

    render(<App />);

    await switchToTransactions();

    expect(
      await screen.findByText(/no account selected yet/i),
    ).toBeInTheDocument();
  });

  it("still shows the page content instead of loading forever, even if loadAccounts unexpectedly rejects", async () => {
    mockLoadAccounts.mockRejectedValue(new Error("boom"));
    mockState({});

    render(<App />);

    await switchToTransactions();
    expect(await screen.findByText("AccountForm stub")).toBeInTheDocument();
  });
});
