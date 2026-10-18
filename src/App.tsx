import { lazy, Suspense, useEffect, useState } from "react";
import { useFinanceStore } from "./store/store";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountBalance } from "@/components/accounts/AccountBalance";
import { AccountsOverview } from "@/components/accounts/AccountsOverview";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Sidebar } from "@/components/layout/Sidebar";
import { CsvImport } from "@/components/transactions/CsvImport";

const MonthlySummary = lazy(() =>
  import("@/components/summary/MonthlySummary").then((mod) => ({
    default: mod.MonthlySummary,
  })),
);

type View = "dashboard" | "transactions" | "summary";

const App = () => {
  const loadAccounts = useFinanceStore((state) => state.loadAccounts);
  const loadAllTransactions = useFinanceStore((state) =>
    state.loadAllTransactions,
  );
  const accounts = useFinanceStore((state) => state.accounts);
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const [hasLoaded, setHasLoaded] = useState(false);
const [activeView, setActiveView] = useState<View>("transactions");

  useEffect(() => {
    loadAccounts()
      .then(() => loadAllTransactions?.())
      .catch(() => {})
      .finally(() => setHasLoaded(true));
  }, [loadAccounts, loadAllTransactions]);

  if (!hasLoaded) {
    return <p className="text-foreground">Loading...</p>;
  }

  const currentAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Personal Finance Dashboard</h1>

        {activeView === "dashboard" && (
          <>
            <AccountsOverview />
            <AccountBalance />
          </>
        )}

        {activeView === "transactions" && (
          <>
            <p className="text-muted-foreground">
              {currentAccount
                ? `Currently adding transactions to: ${currentAccount.name}`
                : "No account selected yet."}
            </p>
            <AccountForm />
            <TransactionForm />
            <CsvImport />
            <TransactionList />
          </>
        )}

        {activeView === "summary" && (
          <Suspense fallback={<p className="text-muted-foreground">Loading summary...</p>}>
            <MonthlySummary />
          </Suspense>
        )}
      </main>
    </div>
  );
};

export default App;
