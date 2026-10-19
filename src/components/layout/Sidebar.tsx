import { useFinanceStore } from "@/store/store";
import { Button } from "@/components/ui/button";

type View = "dashboard" | "transactions" | "summary";

const VIEW_LABELS: Record<View, string> = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  summary: "Summary",
};

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const accounts = useFinanceStore((state) => state.accounts);
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const selectAccount = useFinanceStore((state) => state.selectAccount);

  return (
    <aside className="flex-col w-64 border-r border-border bg-background">
      <nav className="p-4 space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Navigation
        </h2>
        {["dashboard", "transactions", "summary"].map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => onViewChange(view as View)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              activeView === view
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {VIEW_LABELS[view as View]}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Accounts
        </h2>
        <div className="space-y-1">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => selectAccount(account.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors border ${
                selectedAccountId === account.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {account.name}
              <span className="ml-auto text-xs text-muted-foreground">
                {account.type}
              </span>
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full">
          + Add account
        </Button>
      </div>
    </aside>
  );
}
