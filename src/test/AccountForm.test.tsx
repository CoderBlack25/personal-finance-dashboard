/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccountForm } from "../components/AccountForm";
import { useFinanceStore } from "../../store";

vi.mock("../../store", () => {
  const useFinanceStore = vi.fn() as any;
  useFinanceStore.getState = vi.fn();
  return { useFinanceStore };
});

describe("AccountForm", () => {
  const mockCreateAccount = vi.fn();

  beforeEach(() => {
    mockCreateAccount.mockReset();
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({ createAccount: mockCreateAccount, error: null }),
    );
    vi.mocked(useFinanceStore.getState).mockReturnValue({ error: null } as any);
  });

  it("shows a validation error and does not submit when the name is empty", async () => {
    const user = userEvent.setup();
    render(<AccountForm />);

    await user.click(screen.getByRole("button", { name: /add account/i }));

    expect(
      await screen.findByText(/give this account a name/i),
    ).toBeInTheDocument();
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only name the same way as an empty one", async () => {
    const user = userEvent.setup();
    render(<AccountForm />);

    await user.type(screen.getByLabelText(/account name/i), "   ");
    await user.click(screen.getByRole("button", { name: /add account/i }));

    expect(
      await screen.findByText(/give this account a name/i),
    ).toBeInTheDocument();
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it("calls createAccount with the entered values on a valid submission", async () => {
    const user = userEvent.setup();
    mockCreateAccount.mockResolvedValue(undefined);
    render(<AccountForm />);

    await user.type(screen.getByLabelText(/account name/i), "Chase Checking");
    await user.selectOptions(screen.getByLabelText(/account type/i), "savings");
    await user.click(screen.getByRole("button", { name: /add account/i }));

    await waitFor(() =>
      expect(mockCreateAccount).toHaveBeenCalledWith({
        name: "Chase Checking",
        type: "savings",
      }),
    );
  });

  it("disables the submit button while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveCreate!: () => void;
    mockCreateAccount.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    render(<AccountForm />);

    await user.type(screen.getByLabelText(/account name/i), "Chase Checking");
    await user.click(screen.getByRole("button", { name: /add account/i }));

    expect(screen.getByRole("button", { name: /adding/i })).toBeDisabled();

    resolveCreate();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /add account/i }),
      ).not.toBeDisabled(),
    );
  });
});
