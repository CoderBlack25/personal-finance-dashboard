import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useFinanceStore } from "@/store/store";
import {
  useAccounts,
  useAllTransactions,
  useCategories,
  useCategoryBudgets,
} from "@/hooks/useFinanceData";
import {
  calculateCategoryBudgetProgress,
  calculateMonthlyCategorySpending,
  type CategoryBudgetProgress,
} from "@/utils/budgets";
import { dollarsStringToCents, formatCentsToDollar } from "@/utils/money";
import type { Category } from "@/types/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const MIN_REPORT_YEAR = 1900;
const MAX_REPORT_YEAR = 2100;
const BUDGET_AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function isValidYear(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  return year >= MIN_REPORT_YEAR && year <= MAX_REPORT_YEAR;
}

function initialAmount(amountInCents: number | undefined): string {
  return amountInCents === undefined
    ? ""
    : formatCentsToDollar(amountInCents).slice(1);
}

function statusLabel(status: CategoryBudgetProgress["status"]): string {
  switch (status) {
    case "under":
      return "Under budget";
    case "near":
      return "Near limit";
    case "over":
      return "Over budget";
    case "zero":
      return "Zero budget";
  }
}

function CategoryBudgetRow({
  category,
  progress,
}: {
  category: Category;
  progress: CategoryBudgetProgress | undefined;
}) {
  const setCategoryBudget = useFinanceStore(
    (state) => state.setCategoryBudget,
  );
  const deleteCategoryBudget = useFinanceStore(
    (state) => state.deleteCategoryBudget,
  );
  const [amount, setAmount] = useState(() =>
    initialAmount(progress?.amountInCents),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAmount(initialAmount(progress?.amountInCents));
  }, [progress?.amountInCents]);

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    if (!BUDGET_AMOUNT_PATTERN.test(amount)) {
      setError("Enter a positive amount with up to two decimal places.");
      return;
    }

    let amountInCents: number;
    try {
      amountInCents = dollarsStringToCents(amount);
    } catch {
      setError("Enter a valid budget amount.");
      return;
    }
    if (amountInCents <= 0) {
      setError("Budget must be greater than $0.00.");
      return;
    }

    setSaving(true);
    const failure = await setCategoryBudget({
      categoryId: category.id,
      amountInCents,
    });
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setAmount(initialAmount(amountInCents));
    setMessage("Budget saved.");
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const failure = await deleteCategoryBudget(category.id);
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setAmount("");
    setMessage("Budget removed.");
  };

  const statusClass =
    progress?.status === "over"
      ? "bg-destructive"
      : progress?.status === "near"
        ? "bg-warning"
        : progress?.status === "zero"
          ? "bg-muted-foreground"
          : "bg-success";

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground">{category.name}</h3>
          {progress ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <span>
                  Spent{" "}
                  <strong className="font-mono tabular-nums">
                    {formatCentsToDollar(progress.spentInCents)}
                  </strong>{" "}
                  of{" "}
                  <strong className="font-mono tabular-nums">
                    {formatCentsToDollar(progress.amountInCents)}
                  </strong>
                </span>
                <span className="font-medium">{statusLabel(progress.status)}</span>
              </div>
              <div
                role="progressbar"
                aria-label={`${category.name} budget progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, progress.barPercentage)}
                aria-valuetext={
                  progress.percentage === null
                    ? `${formatCentsToDollar(progress.spentInCents)} spent, zero budget`
                    : `${progress.percentage.toFixed(1)}% spent`
                }
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full rounded-full transition-[width] ${statusClass}`}
                  style={{ width: `${progress.barPercentage}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {progress.status === "over"
                  ? `Over budget by ${formatCentsToDollar(
                      Math.max(0, -progress.remainingInCents),
                    )}${
                      progress.percentage === null
                        ? " · no budget set"
                        : ` · ${progress.percentage.toFixed(1)}% of budget`
                    }`
                  : progress.status === "zero"
                    ? "No spending this month"
                    : `${formatCentsToDollar(
                        progress.remainingInCents,
                      )} remaining · ${progress.percentage?.toFixed(1)}% spent`}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              No monthly budget set.
            </p>
          )}
        </div>

        <div className="w-full space-y-2 lg:max-w-sm">
          <label
            htmlFor={`budget-${category.id}`}
            className="text-sm font-medium text-foreground"
          >
            Monthly budget
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-32 flex-1">
              <Input
                id={`budget-${category.id}`}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError(null);
                  setMessage(null);
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? `budget-error-${category.id}` : undefined
                }
                variant={error ? "error" : undefined}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving..." : progress ? "Save changes" : "Set budget"}
            </Button>
            {progress && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void handleRemove()}
              >
                Remove
              </Button>
            )}
          </div>
          {error && (
            <p
              id={`budget-error-${category.id}`}
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-xs text-success-foreground">
              {message}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function BudgetManager() {
  const { data: categories, error: categoriesError } = useCategories();
  const { data: budgets, error: budgetsError } = useCategoryBudgets();
  const { data: allTransactions, error: transactionsError } =
    useAllTransactions();
  const { data: accountData, error: accountsError } = useAccounts();
  const summaryFilters = useFinanceStore((state) => state.summaryFilters);
  const updateSummaryFilters = useFinanceStore(
    (state) => state.updateSummaryFilters,
  );
  const { year, month } = summaryFilters;
  const [yearInput, setYearInput] = useState(String(year));
  const activeAccountIds = useMemo(
    () => new Set(accountData.accounts.map((account) => account.id)),
    [accountData.accounts],
  );
  const activeTransactions = useMemo(
    () =>
      allTransactions.filter((transaction) =>
        activeAccountIds.has(transaction.accountId),
      ),
    [allTransactions, activeAccountIds],
  );
  const spending = useMemo(
    () => calculateMonthlyCategorySpending(activeTransactions, year, month),
    [activeTransactions, year, month],
  );
  const progress = useMemo(
    () => calculateCategoryBudgetProgress(budgets, categories, spending),
    [budgets, categories, spending],
  );
  const progressByCategory = useMemo(
    () => new Map(progress.map((entry) => [entry.categoryId, entry])),
    [progress],
  );
  const monthLabel = format(new Date(year, month - 1), "MMMM yyyy");
  const dataError =
    categoriesError ?? budgetsError ?? transactionsError ?? accountsError;

  return (
    <section className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Monthly budgets</h2>
        <p className="text-sm text-muted-foreground">
          Set a monthly spending target for each category. Only expenses from
          active accounts count toward the progress.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-40 flex-1">
          <label
            htmlFor="budget-month"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Month
          </label>
          <Select
            id="budget-month"
            value={month}
            onChange={(event) =>
              updateSummaryFilters({ month: Number(event.target.value) })
            }
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {format(new Date(year, value - 1), "MMMM")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label
            htmlFor="budget-year"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Year
          </label>
          <Input
            id="budget-year"
            type="number"
            min={MIN_REPORT_YEAR}
            max={MAX_REPORT_YEAR}
            step={1}
            value={yearInput}
            aria-invalid={!isValidYear(yearInput)}
            aria-describedby="budget-year-error"
            onChange={(event) => {
              const value = event.target.value;
              setYearInput(value);
              if (isValidYear(value)) {
                updateSummaryFilters({ year: Number(value) });
              }
            }}
            className="w-32"
          />
          {!isValidYear(yearInput) && (
            <p
              id="budget-year-error"
              role="alert"
              className="mt-1 text-xs text-destructive"
            >
              Enter a year between {MIN_REPORT_YEAR} and {MAX_REPORT_YEAR}.
            </p>
          )}
        </div>
        <p className="pb-2 text-sm font-medium text-foreground">{monthLabel}</p>
      </div>

      {dataError && (
        <p role="alert" className="text-sm text-destructive">
          {dataError}
        </p>
      )}

      {categories.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">
            Add a category before setting a budget.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {categories.map((category) => (
            <CategoryBudgetRow
              key={category.id}
              category={category}
              progress={progressByCategory.get(category.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
