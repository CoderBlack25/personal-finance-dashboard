import { useFinanceStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountActions } from "@/components/accounts/AccountActions";
import { countTransactionsByAccount } from "@/utils/derived";
import {
  LayoutDashboard,
  List,
  PieChart,
  Banknote,
  Plus,
  Tags,
} from "lucide-react";
import type { View } from "@/store/store";

const NAV_ITEMS: Record<View, { label: string; icon: React.ElementType }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  transactions: { label: "Transactions", icon: List },
  summary: { label: "Summary", icon: PieChart },
  categories: { label: "Categories", icon: Tags },
};

const VIEWS = Object.keys(NAV_ITEMS) as View[];

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const accounts = useFinanceStore((state) => state.accounts);
  const archivedAccounts = useFinanceStore((state) => state.archivedAccounts);
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const selectAccount = useFinanceStore((state) => state.selectAccount);
  const allTransactions = useFinanceStore((state) => state.allTransactions);
  const transactionCounts = countTransactionsByAccount(allTransactions);

  return (
    <aside className="flex-col w-64 border-r border-border bg-background shrink-0">
      <div className="flex flex-col h-full">
        <div className="p-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Banknote className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold font-heading tracking-tight">
              Finance
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Personal Finance Dashboard
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Navigation
          </h2>
          {VIEWS.map((view) => {
            const { label, icon: Icon } = NAV_ITEMS[view];
            return (
              <button
                key={view}
                type="button"
                onClick={() => onViewChange(view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  activeView === view
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-4 shrink-0">
          <div className="space-y-1">
            <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Accounts
            </h2>
            <div className="space-y-1">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => selectAccount(account.id)}
                    className={`min-w-0 flex-1 flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                      selectedAccountId === account.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="truncate">{account.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[0.65rem] leading-none opacity-60"
                    >
                      {account.type}
                    </Badge>
                  </button>
                  <AccountActions
                    account={account}
                    transactionCount={
                      transactionCounts.get(account.id) ?? 0
                    }
                  />
                </div>
              ))}
            </div>

            {archivedAccounts.length > 0 && (
              <div className="space-y-1 pt-2">
                <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Archived ({archivedAccounts.length})
                </h3>
                {archivedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-1">
                    <div className="min-w-0 flex-1 flex items-center justify-between px-3 py-2 rounded-md border border-dashed text-sm text-muted-foreground">
                      <span className="truncate">{account.name}</span>
                      <Badge
                        variant="outline"
                        className="text-[0.65rem] leading-none"
                      >
                        archived
                      </Badge>
                    </div>
                    <AccountActions
                      account={account}
                      transactionCount={
                        transactionCounts.get(account.id) ?? 0
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onViewChange("transactions")}
          >
            <Plus className="w-3 h-3 mr-2 shrink-0" />
            Add account
          </Button>
        </div>
      </div>
    </aside>
  );
}
