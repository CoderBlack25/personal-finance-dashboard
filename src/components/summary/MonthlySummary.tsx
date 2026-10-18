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
} from "chart.js";
import { useFinanceStore } from "@/store/store";
import { computeCategoryRollups, computeMonthlySummary } from "@/utils/derived";
import { format } from "date-fns";
import { formatCentsToDollar } from "@/utils/money";

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const rollups = computeCategoryRollups(allTransactions, categories);
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

    // Destroy any existing chart on this canvas (StrictMode double-mount safety)
    chartRef.current?.destroy();
    chartRef.current = null;

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: rollups.map((rollup) => rollup.name),
        datasets: [
          {
            label: "Spending",
            data: rollups.map((rollup) => rollup.spending / 100),
            backgroundColor: rollups.map((rollup) => rollup.color),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Spending by category — ${monthLabel}`,
          },
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Amount (USD)" },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [allTransactions, year, month, categories, rollups, monthLabel]);

  return (
    <section className="bg-card border border-border rounded-lg p-6 space-y-6">
      <h2 className="text-lg font-semibold">Monthly summary</h2>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div>
          <label htmlFor="summary-month" className="block text-sm text-muted-foreground mb-1">
            Month
          </label>
          <select
            id="summary-month"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {[...Array(12)].map((_, index) => index + 1).map((m) => (
              <option key={m} value={m}>
                {format(new Date(now.getFullYear(), m - 1), "MMMM")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="summary-year" className="block text-sm text-muted-foreground mb-1">
            Year
          </label>
          <input
            id="summary-year"
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <canvas ref={canvasRef} aria-label="Spending by category chart" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm text-muted-foreground mb-1">Income</h3>
          <p className="font-mono text-lg" aria-label={incomeLabel}>
            {incomeLabel}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm text-muted-foreground mb-1">Spending</h3>
          <p className="font-mono text-lg" aria-label={spendingLabel}>
            {spendingLabel}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm text-muted-foreground mb-1">Net</h3>
          <p className="font-mono text-lg" aria-label={netLabel}>
            {netLabel}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="text-sm text-primary-foreground hover:underline"
        onClick={() => setShowTable((prev) => !prev)}
        aria-pressed={showTable}
      >
        {showTable ? "Hide data table" : "Show data table"}
      </button>

      {showTable && (
        <div className="bg-card border border-border rounded-lg p-4">
          <table className="w-full border-collapse" aria-label="Spending by category data table">
            <caption className="text-sm font-medium text-foreground mb-2 text-left">
              Spending by category — {monthLabel}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="text-left text-sm text-muted-foreground pb-2">Category</th>
                <th scope="col" className="text-right text-sm text-muted-foreground pb-2">Income</th>
                <th scope="col" className="text-right text-sm text-muted-foreground pb-2">Spending</th>
                <th scope="col" className="text-right text-sm text-muted-foreground pb-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {rollups.map((rollup) => (
                <tr key={rollup.categoryId ?? rollup.name} className="border-t border-border">
                  <td className="py-3">{rollup.name}</td>
                  <td className="py-3 text-right font-mono">{formatCentsToDollar(rollup.income)}</td>
                  <td className="py-3 text-right font-mono">{formatCentsToDollar(rollup.spending)}</td>
                  <td className="py-3 text-right font-mono">
                    {formatCentsToDollar(rollup.net, { alwaysShowSign: true })}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border font-medium">
                <td className="py-3"><strong>Total</strong></td>
                <td className="py-3 text-right font-mono">{formatCentsToDollar(summary.income)}</td>
                <td className="py-3 text-right font-mono">{formatCentsToDollar(summary.spending)}</td>
                <td className="py-3 text-right font-mono">{netLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
