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

describe("Sidebar", () => {
  const mockSelectAccount = vi.fn();

  beforeEach(() => {
    mockSelectAccount.mockReset();
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        accounts: [],
        selectedAccountId: null,
        selectAccount: mockSelectAccount,
      }),
    );
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
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        accounts: [
          { id: "acc-1", name: "Checking", type: "checking" },
          { id: "acc-2", name: "Savings", type: "savings" },
        ],
        selectedAccountId: "acc-1",
        selectAccount: mockSelectAccount,
      }),
    );

    render(<Sidebar activeView="dashboard" onViewChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Savings/ }));

    expect(mockSelectAccount).toHaveBeenCalledWith("acc-2");
  });
});
