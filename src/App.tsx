import { lazy, Suspense, useEffect, useState } from "react";
import { useFinanceStore } from "./store/store";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountBalance } from "@/components/accounts/AccountBalance";
import { AccountsOverview } from "@/components/accounts/AccountsOverview";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Sidebar } from "@/components/layout/Sidebar";
import { CsvImport } from "@/components/transactions/CsvImport";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { useAccounts } from "@/hooks/useFinanceData";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

const MonthlySummary = lazy(() =>
  import("@/components/summary/MonthlySummary").then((mod) => ({
    default: mod.MonthlySummary,
  })),
);

const App = () => {
  const loadAccounts = useFinanceStore((state) => state.loadAccounts);
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const activeView = useFinanceStore((state) => state.activeView);
  const setActiveView = useFinanceStore((state) => state.setActiveView);
  const { data: accountData, isLoading: accountsLoading, error: accountsError } =
    useAccounts();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const accounts = accountData.accounts;
  const archivedAccounts = accountData.archivedAccounts;

  useEffect(() => {
    loadAccounts()
      .catch((cause: unknown) => {
        setLoadError(
          cause instanceof Error ? cause.message : "Could not load accounts.",
        );
      })
      .finally(() => setHasLoaded(true));
  }, [loadAccounts]);

  if (!hasLoaded || accountsLoading) {
    return <p className="text-foreground">Loading...</p>;
  }

  if (loadError || accountsError) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <p role="alert" className="text-sm text-destructive">
          Could not load your accounts. Refresh the page to try again.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {loadError ?? accountsError}
        </p>
      </main>
    );
  }

  const isFirstRun = accounts.length === 0 && archivedAccounts.length === 0;
  if (isFirstRun) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground sm:p-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <header className="space-y-2">
            <p className="text-sm font-medium text-primary">Finance</p>
            <h1 className="text-3xl font-semibold">
              Let’s set up your finances
            </h1>
            <p className="text-muted-foreground">
              Start by adding an account, such as checking, savings, a credit
              card, or cash. Then you can record or import transactions and see
              your balances and monthly spending.
            </p>
          </header>
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <AccountForm />
          </section>
        </div>
      </main>
    );
  }

  const currentAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onAddAccount={() => setIsAddAccountOpen(true)}
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
                : "Select an account from the sidebar to add transactions."}
            </p>
            <TransactionForm />
            <CsvImport />
            <TransactionList />
          </>
        )}

        {activeView === "summary" && (
          <Suspense
            fallback={
              <p className="text-muted-foreground">Loading summary...</p>
            }
          >
            <MonthlySummary />
          </Suspense>
        )}

        {activeView === "categories" && <CategoryManager />}
      </main>
      <Dialog
        open={isAddAccountOpen}
        onOpenChange={setIsAddAccountOpen}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogContent>
            <DialogTitle>Add an account</DialogTitle>
            <DialogDescription>
              Add an account to track its transactions and balance.
            </DialogDescription>
            <div className="mt-4">
              <AccountForm
                onClose={() => setIsAddAccountOpen(false)}
                showHeading={false}
              />
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export default App;
