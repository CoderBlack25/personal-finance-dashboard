/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App";
import { useFinanceStore } from "../../store";

vi.mock("../components/AccountForm", () => ({
  AccountForm: () => <div>AccountForm stub</div>,
}));
vi.mock("../components/TransactionForm", () => ({
  TransactionForm: () => <div>TransactionForm stub</div>,
}));

vi.mock("../../store", () => {
  const useFinanceStore = vi.fn() as any;
  return { useFinanceStore };
});

describe("App", () => {
  const mockLoadAccounts = vi.fn();

  beforeEach(() => {
    mockLoadAccounts.mockReset();
  });

  function mockState(
    overrides: Partial<{ accounts: any[]; selectedAccountId: string | null }>,
  ) {
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        loadAccounts: mockLoadAccounts,
        accounts: [],
        transactions: [],
        selectedAccountId: null,
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

  it("shows the page content once loadAccounts resolves", async () => {
    mockLoadAccounts.mockResolvedValue(undefined);
    mockState({});

    render(<App />);

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

    expect(
      await screen.findByText(/no account selected yet/i),
    ).toBeInTheDocument();
  });

  it("still shows the page content instead of loading forever, even if loadAccounts unexpectedly rejects", async () => {
    mockLoadAccounts.mockRejectedValue(new Error("boom"));
    mockState({});

    render(<App />);

    expect(await screen.findByText("AccountForm stub")).toBeInTheDocument();
  });
});
