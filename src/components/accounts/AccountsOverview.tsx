import { useFinanceStore } from "@/store/store";
import { computeAccountBalances, computeTotalBalance } from "@/utils/derived";
import { formatCentsToDollar } from "@/utils/money";

export function AccountsOverview() {
  const accounts = useFinanceStore((state) => state.accounts);
  const allTransactions = useFinanceStore((state) => state.allTransactions);
  const isLoading = useFinanceStore((state) => state.isLoading);

  const balances = computeAccountBalances(accounts, allTransactions);
  const total = computeTotalBalance(allTransactions);

  if (isLoading) {
    return <p>Loading accounts...</p>;
  }

  return (
    <section aria-label="Account balances" className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Account balances</h2>
      <table className="w-full border-collapse">
        <caption className="sr-only">Balance per account</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left text-sm text-muted-foreground pb-2">Account</th>
            <th scope="col" className="text-left text-sm text-muted-foreground pb-2">Type</th>
            <th scope="col" className="text-right text-sm text-muted-foreground pb-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((balance) => (
            <tr key={balance.accountId} className="border-t border-border">
              <td className="py-3">{balance.name}</td>
              <td className="py-3">{balance.type}</td>
              <td
                className="py-3 text-right font-mono"
                aria-label={formatCentsToDollar(balance.balance, {
                  alwaysShowSign: true,
                })}
              >
                {formatCentsToDollar(balance.balance, {
                  alwaysShowSign: true,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-sm font-medium">
        <strong>Total across all accounts:</strong>{" "}
        {formatCentsToDollar(total, { alwaysShowSign: true })}
      </p>
    </section>
  );
}
