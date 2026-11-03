import { useEffect, useRef, useState } from "react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  type Tick,
} from "chart.js";
import { useFinanceStore } from "@/store/store";
import {
  useAccounts,
  useAllTransactions,
  useCategories,
} from "@/hooks/useFinanceData";
import {
  computeCategoryRollups,
  computeMonthlySummary,
  filterTransactionsForAccounts,
} from "@/utils/derived";
import { format } from "date-fns";
import {
  formatAccessibleMoney,
  formatCentsToDollar,
} from "@/utils/money";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PieChart } from "lucide-react";

Chart.register(
  BarController,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export function MonthlySummary() {
  const { data: allTransactions, error: transactionsError } =
    useAllTransactions();
  const { data: accountData, error: accountsError } = useAccounts();
  const { data: categories, error: categoriesError } = useCategories();
  const { accounts } = accountData;
  const summaryFilters = useFinanceStore((state) => state.summaryFilters);
  const updateSummaryFilters = useFinanceStore(
    (state) => state.updateSummaryFilters,
  );
  const now = new Date();
  const { year, month, dateFrom, dateTo } = summaryFilters;
  const [showTable, setShowTable] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const transactions = filterTransactionsForAccounts(allTransactions, accounts);
  const rollups = computeCategoryRollups(transactions, categories, {
    dateFrom,
    dateTo,
    year,
    month,
  });
  const summary = computeMonthlySummary(transactions, year, month, {
    dateFrom,
    dateTo,
  });
  const monthLabel = format(new Date(year, month - 1), "MMMM yyyy");

  const incomeLabel = formatCentsToDollar(summary.income, {
    alwaysShowSign: true,
  });
  const spendingLabel = formatCentsToDollar(summary.spending, {
    alwaysShowSign: true,
  });
  const netLabel = formatCentsToDollar(summary.net, {
    alwaysShowSign: true,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    chartRef.current?.destroy();
    chartRef.current = null;

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: rollups.map((rollup) => rollup.name),
        datasets: [
          {
            label: "Income",
            data: rollups.map((rollup) => rollup.income / 100),
            backgroundColor: "#22c55e",
            borderColor: "#16a34a",
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: "Spending",
            data: rollups.map((rollup) => rollup.spending / 100),
            backgroundColor: "#ef4444",
            borderColor: "#dc2626",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text:
              dateFrom || dateTo
                ? `Income & Spending by category`
                : `Income & Spending by category — ${monthLabel}`,
            color: "var(--foreground)",
            font: {
              size: 13,
              weight: 500,
            },
          },
          legend: { display: true },
          tooltip: {
            backgroundColor: "var(--popover)",
            titleColor: "var(--popover-foreground)",
            bodyColor: "var(--popover-foreground)",
            borderColor: "var(--border)",
            borderWidth: 1,
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 12 },
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                if (value === null || value === undefined) return "";
                const label = context.dataset.label || "";
                return `${label}: ${formatCentsToDollar(value * 100)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Amount (USD)",
              color: "var(--muted-foreground)",
              font: { size: 11, weight: 500 },
            },
            ticks: {
              color: "var(--muted-foreground)",
              font: { size: 11 },
              callback: (value: string | number | Tick) => {
                const num = typeof value === "number" ? value : Number(value);
                return `$${Number.isFinite(num) ? num : 0}`;
              },
            },
            grid: {
              color: "var(--border)",
            },
          },
          x: {
            ticks: {
              color: "var(--muted-foreground)",
              font: { size: 11 },
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [
    transactions,
    year,
    month,
    categories,
    rollups,
    monthLabel,
    dateFrom,
    dateTo,
  ]);

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <PieChart className="w-4 h-4 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Monthly summary</h2>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="summary-month"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Month
          </label>
          <Select
            id="summary-month"
            value={month}
            onChange={(event) =>
              updateSummaryFilters({ month: Number(event.target.value) })
            }
          >
            {[...Array(12)]
              .map((_, index) => index + 1)
              .map((m) => (
                <option key={m} value={m}>
                  {format(new Date(now.getFullYear(), m - 1), "MMMM")}
                </option>
              ))}
          </Select>
        </div>
        <div className="min-w-25">
          <label
            htmlFor="summary-year"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Year
          </label>
          <Input
            id="summary-year"
            type="number"
            value={year}
            onChange={(event) =>
              updateSummaryFilters({ year: Number(event.target.value) })
            }
            className="w-32"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="summary-date-from"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            From
          </label>
          <Input
            id="summary-date-from"
            type="date"
            value={dateFrom}
            onChange={(event) =>
              updateSummaryFilters({ dateFrom: event.target.value })
            }
            className="w-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label
            htmlFor="summary-date-to"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            To
          </label>
          <Input
            id="summary-date-to"
            type="date"
            value={dateTo}
            onChange={(event) =>
              updateSummaryFilters({ dateTo: event.target.value })
            }
            className="w-full"
          />
        </div>
      </div>

      {(transactionsError || accountsError || categoriesError) && (
        <p role="alert" className="text-sm text-destructive">
          {transactionsError ?? accountsError ?? categoriesError}
        </p>
      )}

      <div className="h-64 rounded-lg border border-border bg-card p-4">
        <canvas
          ref={canvasRef}
          aria-label="Income and spending by category chart"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            Income
          </h3>
          <output
            className="font-mono tabular-nums text-lg text-success-foreground"
            aria-label={formatAccessibleMoney(summary.income)}
          >
            {incomeLabel}
          </output>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            Spending
          </h3>
          <output
            className="font-mono tabular-nums text-lg text-destructive"
            aria-label={formatAccessibleMoney(-summary.spending)}
            title="Total outflow this month"
          >
            {spendingLabel}
          </output>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            Net
          </h3>
          <output
            className={`font-mono tabular-nums text-lg ${summary.net >= 0 ? "text-success-foreground" : "text-destructive"}`}
            aria-label={formatAccessibleMoney(summary.net)}
          >
            {netLabel}
          </output>
        </div>
      </div>

      <button
        type="button"
        className="text-sm text-primary-foreground hover:underline transition-colors"
        onClick={() => setShowTable((prev) => !prev)}
        aria-pressed={showTable}
      >
        {showTable ? "Hide data table" : "Show data table"}
      </button>

      {showTable && (
        <div className="rounded-lg border border-border bg-card p-4">
          <table
            className="w-full text-sm border-collapse"
            aria-label="Income and spending by category data table"
          >
            <caption className="text-left text-sm font-medium text-foreground mb-2">
              Income and spending by category
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="text-left text-xs text-muted-foreground pb-2 font-medium"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="text-right text-xs text-muted-foreground pb-2 font-medium"
                >
                  Income
                </th>
                <th
                  scope="col"
                  className="text-right text-xs text-muted-foreground pb-2 font-medium"
                >
                  Spending
                </th>
                <th
                  scope="col"
                  className="text-right text-xs text-muted-foreground pb-2 font-medium"
                >
                  Net
                </th>
              </tr>
            </thead>
            <tbody>
              {rollups.map((rollup) => (
                <tr
                  key={rollup.categoryId ?? rollup.name}
                  className="border-t border-border"
                >
                  <td className="py-3 text-sm text-foreground">
                    {rollup.name}
                  </td>
                  <td
                    className="py-3 text-right font-mono tabular-nums text-sm"
                    aria-label={formatAccessibleMoney(rollup.income)}
                  >
                    {formatCentsToDollar(rollup.income)}
                  </td>
                  <td
                    className="py-3 text-right font-mono tabular-nums text-sm"
                    aria-label={formatAccessibleMoney(-rollup.spending)}
                  >
                    {formatCentsToDollar(rollup.spending)}
                  </td>
                  <td
                    className="py-3 text-right font-mono tabular-nums text-sm"
                    aria-label={formatAccessibleMoney(rollup.net)}
                  >
                    {formatCentsToDollar(rollup.net, {
                      alwaysShowSign: true,
                    })}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border font-medium">
                <td className="py-3 text-sm text-foreground">
                  <strong>Total</strong>
                </td>
                <td
                  className="py-3 text-right font-mono tabular-nums text-sm"
                  aria-label={formatAccessibleMoney(summary.income)}
                >
                  {formatCentsToDollar(summary.income)}
                </td>
                <td
                  className="py-3 text-right font-mono tabular-nums text-sm"
                  aria-label={formatAccessibleMoney(-summary.spending)}
                >
                  {formatCentsToDollar(summary.spending)}
                </td>
                <td
                  className="py-3 text-right font-mono tabular-nums text-sm"
                  aria-label={formatAccessibleMoney(summary.net)}
                >
                  {netLabel}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
