/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { dollarsStringToCents } from "../../../utils/money";
import { useFinanceStore } from "../../../store/store";

describe("dollarsStringToCents", () => {
  it.each([
    ["42.50", 4250],
    ["42.5", 4250],
    ["42", 4200],
    ["0.99", 99],
    ["0.05", 5],
    ["1000", 100000],
    ["9.9", 990],
  ])("converts %s to %i cents", (input, expected) => {
    expect(dollarsStringToCents(input)).toBe(expected);
  });
});

vi.mock("../../../store/store", () => {
  const useFinanceStore = vi.fn() as any;
  useFinanceStore.getState = vi.fn();
  return { useFinanceStore };
});

describe("TransactionForm", () => {
  const mockCreateTransaction = vi.fn();

  beforeEach(() => {
    mockCreateTransaction.mockReset();
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        selectedAccountId: "acc_1",
        createTransaction: mockCreateTransaction,
        categories: [],
        error: null,
      }),
    );
    vi.mocked(useFinanceStore.getState).mockReturnValue({ error: null } as any);
  });

  it("shows a fallback message instead of the form when no account is selected", () => {
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        selectedAccountId: null,
        createTransaction: mockCreateTransaction,
        categories: [],
        error: null,
      }),
    );
    render(<TransactionForm />);
    expect(screen.getByText(/add an account first/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add transaction/i }),
    ).not.toBeInTheDocument();
  });

  it("defaults to Expense selected", () => {
    render(<TransactionForm />);
    expect(screen.getByRole("radio", { name: /expense/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /income/i })).not.toBeChecked();
  });

  it("rejects an amount with three decimal places", async () => {
    const user = userEvent.setup();
    render(<TransactionForm />);
    await user.type(screen.getByLabelText(/amount/i), "42.999");
    await user.type(screen.getByLabelText(/description/i), "Test");
    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    expect(
      await screen.findByText(/enter a valid amount/i),
    ).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("rejects a zero amount even though it matches the number format", async () => {
    const user = userEvent.setup();
    render(<TransactionForm />);
    await user.type(screen.getByLabelText(/amount/i), "0.00");
    await user.type(screen.getByLabelText(/description/i), "Test");
    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    expect(await screen.findByText(/more than zero/i)).toBeInTheDocument();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("submits an expense as a negative amountInCents", async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockResolvedValue(undefined);
    render(<TransactionForm />);
    await user.type(screen.getByLabelText(/amount/i), "42.50");
    await user.type(screen.getByLabelText(/description/i), "Coffee");
    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: "acc_1",
          amountInCents: -4250,
          description: "Coffee",
        }),
      ),
    );
  });

  it("submits income as a positive amountInCents", async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockResolvedValue(undefined);
    render(<TransactionForm />);
    await user.click(screen.getByRole("radio", { name: /income/i }));
    await user.type(screen.getByLabelText(/amount/i), "1200");
    await user.type(screen.getByLabelText(/description/i), "Paycheck");
    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: "acc_1",
          amountInCents: 120000,
          description: "Paycheck",
        }),
      ),
    );
  });
});
