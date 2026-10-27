import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useFinanceStore } from "@/store/store";
import { AccountActions } from "@/components/accounts/AccountActions";
import { getAccounts } from "@/services/db";
import type { Account } from "@/types/types";

async function createAccount(name: string): Promise<Account> {
  await useFinanceStore.getState().createAccount({ name, type: "checking" });
  const created = useFinanceStore.getState().accounts.at(-1);
  if (!created) throw new Error("account was not created");
  return created;
}

describe("AccountActions (integration, real store + real IndexedDB)", () => {
  beforeEach(() => {
    localStorage.clear();
    useFinanceStore.setState({
      accounts: [],
      archivedAccounts: [],
      transactions: [],
      allTransactions: [],
      selectedAccountId: null,
      isLoading: false,
      error: null,
    });
  });

  it("archives an account through the menu and persists it", async () => {
    const user = userEvent.setup();
    const account = await createAccount("Checking");

    render(<AccountActions account={account} transactionCount={0} />);

    await user.click(
      screen.getByRole("button", { name: `Account actions for ${account.name}` }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Archive" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(`Archive ${account.name}?`)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Archive" }));

    await waitFor(() => {
      const state = useFinanceStore.getState();
      expect(state.accounts.find((a) => a.id === account.id)).toBeUndefined();
      expect(state.archivedAccounts.find((a) => a.id === account.id)).toBeDefined();
    });

    const stored = await getAccounts();
    expect(stored.find((a) => a.id === account.id)?.archived).toBe(true);
  });

  it("deletes an account that has no transactions", async () => {
    const user = userEvent.setup();
    const account = await createAccount("Empty Account");

    render(<AccountActions account={account} transactionCount={0} />);

    await user.click(
      screen.getByRole("button", { name: `Account actions for ${account.name}` }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      const state = useFinanceStore.getState();
      expect(state.accounts.find((a) => a.id === account.id)).toBeUndefined();
    });

    const stored = await getAccounts();
    expect(stored.find((a) => a.id === account.id)).toBeUndefined();
  });

  it("disables delete for an account that still has transactions", async () => {
    const user = userEvent.setup();
    const account = await createAccount("Busy Account");
    await useFinanceStore.getState().createTransaction({
      accountId: account.id,
      amountInCents: -1000,
      date: "2026-08-01",
      description: "Coffee",
      categoryId: null,
    });

    render(<AccountActions account={account} transactionCount={1} />);

    await user.click(
      screen.getByRole("button", { name: `Account actions for ${account.name}` }),
    );

    const deleteItem = await screen.findByRole("menuitem", { name: "Delete" });
    expect(deleteItem).toHaveAttribute("aria-disabled", "true");
    expect(deleteItem).toHaveAttribute(
      "title",
      "This account still has transactions. Archive it instead.",
    );

    // A disabled item must not open the confirmation dialog.
    await user.click(deleteItem);
    expect(screen.queryByRole("dialog")).toBeNull();

    const stored = await getAccounts();
    expect(stored.find((a) => a.id === account.id)).toBeDefined();
  });
});
