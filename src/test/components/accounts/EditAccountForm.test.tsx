/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditAccountForm } from "@/components/accounts/EditAccountForm";
import { useFinanceStore } from "@/store/store";
import type { Account } from "@/types/types";

vi.mock("@/store/store", () => {
  const useFinanceStore = vi.fn() as any;
  useFinanceStore.getState = vi.fn();
  return { useFinanceStore };
});

describe("EditAccountForm", () => {
  const mockUpdateAccount = vi.fn();
  const mockOnDone = vi.fn();
  const testAccount: Account = {
    id: "acc-1",
    name: "Chase Checking",
    type: "checking",
    archived: false,
  };

  beforeEach(() => {
    mockUpdateAccount.mockReset();
    mockOnDone.mockReset();
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({ updateAccount: mockUpdateAccount, error: null }),
    );
    vi.mocked(useFinanceStore.getState).mockReturnValue({ error: null } as any);
  });

  it("pre-fills form with existing account name and type", () => {
    render(<EditAccountForm account={testAccount} onDone={mockOnDone} />);
    expect(screen.getByLabelText(/account name/i)).toHaveValue("Chase Checking");
    expect(screen.getByLabelText(/account type/i)).toHaveValue("checking");
  });

  it("shows a validation error when the name is emptied", async () => {
    const user = userEvent.setup();
    render(<EditAccountForm account={testAccount} onDone={mockOnDone} />);
    const nameInput = screen.getByLabelText(/account name/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/give this account a name/i),
    ).toBeInTheDocument();
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it("calls updateAccount with trimmed name and new type, and calls onDone on success", async () => {
    const user = userEvent.setup();
    mockUpdateAccount.mockResolvedValue(null);
    render(<EditAccountForm account={testAccount} onDone={mockOnDone} />);

    const nameInput = screen.getByLabelText(/account name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "  Emergency Savings  ");
    await user.selectOptions(screen.getByLabelText(/account type/i), "savings");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockUpdateAccount).toHaveBeenCalledWith({
        id: "acc-1",
        name: "Emergency Savings",
        type: "savings",
        archived: false,
      }),
    );
    expect(mockOnDone).toHaveBeenCalled();
  });

  it("calls onDone when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<EditAccountForm account={testAccount} onDone={mockOnDone} />);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockOnDone).toHaveBeenCalled();
  });
});

