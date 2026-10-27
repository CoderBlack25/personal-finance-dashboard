/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "@/components/layout/Sidebar";
import { useFinanceStore } from "@/store/store";

vi.mock("@/store/store", () => {
  const useFinanceStore = vi.fn() as any;
  useFinanceStore.getState = vi.fn();
  return { useFinanceStore };
});

const mockArchiveAccount = vi.fn();
const mockRestoreAccount = vi.fn();
const mockDeleteAccount = vi.fn();

describe("Sidebar", () => {
  const mockSelectAccount = vi.fn();

  function mockState(
    overrides: Partial<{ accounts: any[]; archivedAccounts: any[] }> = {},
  ) {
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        accounts: [],
        archivedAccounts: [],
        allTransactions: [],
        selectedAccountId: null,
        selectAccount: mockSelectAccount,
        archiveAccount: mockArchiveAccount,
        restoreAccount: mockRestoreAccount,
        deleteAccount: mockDeleteAccount,
        ...overrides,
      }),
    );
  }

  beforeEach(() => {
    mockSelectAccount.mockReset();
    mockArchiveAccount.mockReset();
    mockRestoreAccount.mockReset();
    mockDeleteAccount.mockReset();
    mockArchiveAccount.mockResolvedValue(null);
    mockRestoreAccount.mockResolvedValue(null);
    mockDeleteAccount.mockResolvedValue(null);
    mockState();
  });

  it("renders a navigation item for every view", () => {
    render(<Sidebar activeView="dashboard" onViewChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Transactions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Summary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Categories" }),
    ).toBeInTheDocument();
  });

  it("changes the view when a navigation item is clicked", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(<Sidebar activeView="dashboard" onViewChange={onViewChange} />);

    await user.click(screen.getByRole("button", { name: "Categories" }));

    expect(onViewChange).toHaveBeenCalledWith("categories");
  });

  it("lists accounts and selects the one that is clicked", async () => {
    const user = userEvent.setup();
    mockState({
      accounts: [
        { id: "acc-1", name: "Checking", type: "checking", archived: false },
        { id: "acc-2", name: "Savings", type: "savings", archived: false },
      ],
    });

    render(<Sidebar activeView="dashboard" onViewChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Savings/ }));

    expect(mockSelectAccount).toHaveBeenCalledWith("acc-2");
  });

  it("lists archived accounts separately", () => {
    mockState({
      accounts: [
        { id: "acc-1", name: "Checking", type: "checking", archived: false },
      ],
      archivedAccounts: [
        { id: "acc-2", name: "Old Card", type: "credit", archived: true },
      ],
    });

    render(<Sidebar activeView="dashboard" onViewChange={vi.fn()} />);

    expect(screen.getByText("Archived (1)")).toBeInTheDocument();
    expect(screen.getByText("Old Card")).toBeInTheDocument();
  });

  it("hides the archived section when there are no archived accounts", () => {
    mockState({
      accounts: [
        { id: "acc-1", name: "Checking", type: "checking", archived: false },
      ],
    });

    render(<Sidebar activeView="dashboard" onViewChange={vi.fn()} />);

    expect(screen.queryByText(/^Archived/)).toBeNull();
  });

  it("offers archive for an active account", async () => {
    const user = userEvent.setup();
    mockState({
      accounts: [
        { id: "acc-1", name: "Checking", type: "checking", archived: false },
      ],
    });

    render(<Sidebar activeView="dashboard" onViewChange={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Account actions for Checking" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Archive" }));

    expect(screen.getByText("Archive Checking?")).toBeInTheDocument();
  });

  it("offers restore for an archived account", async () => {
    const user = userEvent.setup();
    mockState({
      archivedAccounts: [
        { id: "acc-2", name: "Old Card", type: "credit", archived: true },
      ],
    });

    render(<Sidebar activeView="dashboard" onViewChange={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Account actions for Old Card" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Restore" }));

    expect(mockRestoreAccount).toHaveBeenCalledWith("acc-2");
  });

  it("disables delete for an account that still has transactions", async () => {
    const user = userEvent.setup();
    mockState({
      accounts: [
        { id: "acc-1", name: "Checking", type: "checking", archived: false },
      ],
    });
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        accounts: [
          { id: "acc-1", name: "Checking", type: "checking", archived: false },
        ],
        archivedAccounts: [],
        allTransactions: [
          {
            id: "tx-1",
            accountId: "acc-1",
            categoryId: null,
            description: "Groceries",
            amountInCents: -5000,
            date: "2026-08-28",
          },
        ],
        selectedAccountId: null,
        selectAccount: mockSelectAccount,
        archiveAccount: mockArchiveAccount,
        restoreAccount: mockRestoreAccount,
        deleteAccount: mockDeleteAccount,
      }),
    );

    render(<Sidebar activeView="dashboard" onViewChange={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Account actions for Checking" }),
    );

    const deleteItem = await screen.findByRole("menuitem", { name: "Delete" });
    expect(deleteItem).toHaveAttribute("aria-disabled", "true");
  });
});
