import { useEffect, useState } from "react";
import { useFinanceStore } from "../store";
import { AccountForm } from "./components/AccountForm";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionList } from "./components/TransactionList";

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
    <main>
      <h1>Personal Finance Dashboard</h1>

      <AccountForm />

      <p>
        {currentAccount
          ? `Currently adding transactions to: ${currentAccount.name}`
          : "No account selected yet."}
      </p>

      <TransactionForm />
      <TransactionList />
    </main>
  );
};

export default App;
