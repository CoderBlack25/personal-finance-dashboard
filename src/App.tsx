import { useEffect, useState } from "react";
import { useFinanceStore } from "./store/store";
import { AccountForm } from "@/components/accounts/AccountForm";
import { AccountBalance } from "@/components/accounts/AccountBalance";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";

const App = () => {
  const loadAccounts = useFinanceStore((state) => state.loadAccounts);
  const accounts = useFinanceStore((state) => state.accounts);
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    loadAccounts()
      .catch(() => {})
      .finally(() => setHasLoaded(true));
  }, [loadAccounts]);

  if (!hasLoaded) {
    return <p>Loading...</p>;
  }

  const currentAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );

  return (
    <main className="bg-black min-h-screen px-20">
      <h1 className="text-white">Personal Finance Dashboard</h1>

      <AccountForm />

      <p className="text-white">
        {currentAccount
          ? `Currently adding transactions to: ${currentAccount.name}`
          : "No account selected yet."}
      </p>
      <AccountBalance />
      <TransactionForm />
      <TransactionList />
    </main>
  );
};

export default App;
