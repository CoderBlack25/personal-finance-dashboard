import { useFinanceStore } from "@/store/store";
import {
  computeAccountBalances,
  computeTotalBalance,
  filterTransactionsForAccounts,
} from "@/utils/derived";
import { formatCentsToDollar } from "@/utils/money";
import { Badge } from "@/components/ui/badge";

export function AccountsOverview() {
  const accounts = useFinanceStore((state) => state.accounts);
  const allTransactions = useFinanceStore((state) => state.allTransactions);
  const isLoading = useFinanceStore((state) => state.isLoading);

  const activeTransactions = filterTransactionsForAccounts(
    allTransactions,
    accounts,
  );
  const balances = computeAccountBalances(accounts, activeTransactions);
  const total = computeTotalBalance(activeTransactions);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        Loading accounts...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
        <p className="text-xs text-muted-foreground">
          Add an account to get started.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Account balances"
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold mb-4">Account balances</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Balance per account</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="text-left text-xs text-muted-foreground pb-3 font-medium"
              >
                Account
              </th>
              <th
                scope="col"
                className="text-left text-xs text-muted-foreground pb-3 font-medium"
              >
                Type
              </th>
              <th
                scope="col"
                className="text-right text-xs text-muted-foreground pb-3 font-medium"
              >
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr key={balance.accountId} className="border-t border-border">
                <td className="py-3 text-sm text-foreground">{balance.name}</td>
                <td className="py-3">
                  <Badge variant="outline" className="text-[0.7rem]">
                    {balance.type}
                  </Badge>
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-foreground">
                  {formatCentsToDollar(balance.balance, {
                    alwaysShowSign: true,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm font-medium text-foreground">
        <strong>Total across all accounts:</strong>{" "}
        <span className="font-mono tabular-nums">
          {formatCentsToDollar(total, { alwaysShowSign: true })}
        </span>
      </p>
    </section>
  );
}
