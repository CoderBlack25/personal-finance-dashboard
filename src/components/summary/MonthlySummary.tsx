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
import { computeCategoryRollups, computeMonthlySummary } from "@/utils/derived";
import { format } from "date-fns";
import { formatCentsToDollar } from "@/utils/money";
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
  const allTransactions = useFinanceStore((state) => state.allTransactions);
  const categories = useFinanceStore((state) => state.categories);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showTable, setShowTable] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const rollups = computeCategoryRollups(allTransactions, categories, {
    dateFrom,
    dateTo,
  });
  const summary = computeMonthlySummary(allTransactions, year, month);
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
    allTransactions,
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
            onChange={(event) => setMonth(Number(event.target.value))}
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
            onChange={(event) => setYear(Number(event.target.value))}
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
            onChange={(event) => setDateFrom(event.target.value)}
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
            onChange={(event) => setDateTo(event.target.value)}
            className="w-full"
          />
        </div>
      </div>

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
          <p
            className="font-mono tabular-nums text-lg text-success-foreground"
            aria-label={incomeLabel}
          >
            {incomeLabel}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            Spending
          </h3>
          <p
            className="font-mono tabular-nums text-lg text-destructive"
            aria-label={spendingLabel}
            title="Total outflow this month"
          >
            {spendingLabel}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            Net
          </h3>
          <p
            className={`font-mono tabular-nums text-lg ${summary.net >= 0 ? "text-success-foreground" : "text-destructive"}`}
            aria-label={netLabel}
          >
            {netLabel}
          </p>
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
                  <td className="py-3 text-right font-mono tabular-nums text-sm">
                    {formatCentsToDollar(rollup.income)}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums text-sm">
                    {formatCentsToDollar(rollup.spending)}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums text-sm">
                    {formatCentsToDollar(rollup.net, { alwaysShowSign: true })}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border font-medium">
                <td className="py-3 text-sm text-foreground">
                  <strong>Total</strong>
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-sm">
                  {formatCentsToDollar(summary.income)}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-sm">
                  {formatCentsToDollar(summary.spending)}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-sm">
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
