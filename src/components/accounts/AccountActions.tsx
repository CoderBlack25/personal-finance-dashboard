import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useFinanceStore } from "@/store/store";
import type { Account } from "@/types/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  dropdownMenuContentVariants,
  dropdownMenuItemVariants,
  dropdownMenuPositionerVariants,
  dropdownMenuSeparatorVariants,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AccountActionsProps {
  account: Account;
  transactionCount: number;
}

type ConfirmAction = "archive" | "delete";

export function AccountActions({
  account,
  transactionCount,
}: AccountActionsProps) {
  const archiveAccount = useFinanceStore((state) => state.archiveAccount);
  const restoreAccount = useFinanceStore((state) => state.restoreAccount);
  const deleteAccount = useFinanceStore((state) => state.deleteAccount);
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<ConfirmAction>("archive");
  const [error, setError] = useState<string | null>(null);

  const isArchived = account.archived;
  const canDelete = transactionCount === 0;

  const request = (next: ConfirmAction) => {
    setAction(next);
    setError(null);
    setOpen(true);
  };

  const confirm = async () => {
    const failure =
      action === "archive"
        ? await archiveAccount(account.id)
        : await deleteAccount(account.id);

    if (failure) {
      setError(failure);
      return;
    }

    setOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Account actions for ${account.name}`}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreHorizontal className="w-4 h-4" />
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuPositioner
            className={dropdownMenuPositionerVariants()}
          >
            <DropdownMenuContent className={dropdownMenuContentVariants()}>
              {isArchived ? (
                <DropdownMenuItem
                  className={dropdownMenuItemVariants()}
                  onClick={() => void restoreAccount(account.id)}
                >
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className={dropdownMenuItemVariants()}
                  onClick={() => request("archive")}
                >
                  Archive
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator
                className={dropdownMenuSeparatorVariants()}
              />

              <DropdownMenuItem
                className={cn(dropdownMenuItemVariants(), "text-destructive")}
                disabled={!canDelete}
                title={
                  canDelete
                    ? undefined
                    : "This account still has transactions. Archive it instead."
                }
                onClick={() => request("delete")}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPositioner>
        </DropdownMenuPortal>
      </DropdownMenu>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
          }
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogContent>
            {action === "archive" ? (
              <>
                <DialogTitle>Archive {account.name}?</DialogTitle>
                <DialogDescription>
                  It will be removed from your balances and the dashboard. Its
                  transactions are kept, so you can restore it later.
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle>Delete {account.name}?</DialogTitle>
                <DialogDescription>
                  This permanently removes the account. This cannot be undone.
                </DialogDescription>
              </>
            )}

            {error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={action === "delete" ? "destructive" : "default"}
                onClick={() => void confirm()}
              >
                {action === "delete" ? "Delete" : "Archive"}
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}
