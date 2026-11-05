import type { Transaction } from "@/types/types";

export type RecurringFrequency = "weekly" | "bi-weekly" | "monthly" | "yearly";
export type RecurrenceConfidence = "high" | "medium" | "low";

export interface RecurringDetectionOptions {
  amountToleranceCents: number;
  amountTolerancePercent: number;
  weeklyToleranceDays: number;
  biWeeklyToleranceDays: number;
  monthlyToleranceDays: number;
  yearlyToleranceDays: number;
}

export interface RecurringGroup {
  key: string;
  normalizedDescription: string;
  type: "income" | "expense";
  frequency: RecurringFrequency | null;
  confidence: RecurrenceConfidence;
  score: number;
  intervalConsistency: number;
  intervalPrecision: number;
  amountConsistency: number;
  categoryConsistency: number;
  transactionIds: string[];
  typicalAmountInCents: number | null;
}

export const DEFAULT_RECURRING_DETECTION_OPTIONS: RecurringDetectionOptions = {
  amountToleranceCents: 100,
  amountTolerancePercent: 0.05,
  weeklyToleranceDays: 2,
  biWeeklyToleranceDays: 3,
  monthlyToleranceDays: 4,
  yearlyToleranceDays: 7,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const FREQUENCIES: RecurringFrequency[] = [
  "weekly",
  "bi-weekly",
  "monthly",
  "yearly",
];

type TransactionGroup = {
  key: string;
  normalizedDescription: string;
  type: "income" | "expense";
  transactions: Transaction[];
};

export function normalizeRecurringDescription(description: string): string {
  return description
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+ref(?:erence)?[:\s-]+[a-z0-9-]+$/i, "")
    .replace(/\s+(?:#[a-z0-9-]*\d[a-z0-9-]*|#\w+|\d[\d-]*)$/i, "")
    .trim();
}

export function getRecurringGroupKey(
  transaction: Pick<Transaction, "description" | "amountInCents">,
): string | null {
  if (transaction.amountInCents === 0) return null;
  const description = normalizeRecurringDescription(transaction.description);
  if (!description) return null;
  return JSON.stringify([
    description,
    transaction.amountInCents > 0 ? "income" : "expense",
  ]);
}

function parseDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    ? null
    : parsed;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_IN_MS);
}

function addMonthsClamped(date: Date, months: number): Date {
  const originalDay = date.getUTCDate();
  const isEndOfMonth =
    originalDay === new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
  const targetMonth = date.getUTCMonth() + months;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), targetMonth + 1, 0),
  ).getUTCDate();
  const targetDay = isEndOfMonth
    ? lastDayOfTargetMonth
    : Math.min(originalDay, lastDayOfTargetMonth);
  return new Date(Date.UTC(date.getUTCFullYear(), targetMonth, targetDay));
}

function addYearsClamped(date: Date, years: number): Date {
  const targetYear = date.getUTCFullYear() + years;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      date.getUTCMonth(),
      Math.min(date.getUTCDate(), lastDayOfTargetMonth),
    ),
  );
}

function expectedNextDate(
  date: Date,
  frequency: RecurringFrequency,
): Date {
  switch (frequency) {
    case "weekly":
      return new Date(date.getTime() + 7 * DAY_IN_MS);
    case "bi-weekly":
      return new Date(date.getTime() + 14 * DAY_IN_MS);
    case "monthly":
      return addMonthsClamped(date, 1);
    case "yearly":
      return addYearsClamped(date, 1);
  }
}

function getFrequencyTolerance(
  frequency: RecurringFrequency,
  options: RecurringDetectionOptions,
): number {
  switch (frequency) {
    case "weekly":
      return options.weeklyToleranceDays;
    case "bi-weekly":
      return options.biWeeklyToleranceDays;
    case "monthly":
      return options.monthlyToleranceDays;
    case "yearly":
      return options.yearlyToleranceDays;
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function categoryConsistency(transactions: Transaction[]): number {
  const counts = new Map<string | null, number>();
  for (const transaction of transactions) {
    counts.set(
      transaction.categoryId,
      (counts.get(transaction.categoryId) ?? 0) + 1,
    );
  }
  return Math.max(...counts.values()) / transactions.length;
}

function getBestFrequency(
  dates: Date[],
  options: RecurringDetectionOptions,
): {
  frequency: RecurringFrequency | null;
  consistency: number;
  precision: number;
} {
  let best: {
    frequency: RecurringFrequency | null;
    consistency: number;
    precision: number;
  } = {
    frequency: null,
    consistency: 0,
    precision: 0,
  };

  for (const frequency of FREQUENCIES) {
    let matches = 0;
    let normalizedError = 0;
    const tolerance = getFrequencyTolerance(frequency, options);
    for (let index = 1; index < dates.length; index++) {
      const expected = expectedNextDate(dates[index - 1], frequency);
      const drift = Math.abs(daysBetween(expected, dates[index]));
      normalizedError += Math.min(1, drift / Math.max(1, tolerance * 2));
      if (drift <= tolerance) {
        matches++;
      }
    }

    const consistency = matches / (dates.length - 1);
    const precision = 1 - normalizedError / (dates.length - 1);
    if (
      consistency > best.consistency ||
      (consistency === best.consistency && precision > best.precision)
    ) {
      best = { frequency, consistency, precision };
    }
  }
  return best;
}

function analyzeGroup(
  group: TransactionGroup,
  options: RecurringDetectionOptions,
): RecurringGroup {
  const transactions = [...group.transactions].sort((a, b) =>
    a.date === b.date
      ? a.id.localeCompare(b.id)
      : a.date.localeCompare(b.date),
  );
  const amounts = transactions.map((transaction) =>
    Math.abs(transaction.amountInCents),
  );
  const typicalAmountInCents = median(amounts);
  const amountTolerance = Math.max(
    options.amountToleranceCents,
    typicalAmountInCents * options.amountTolerancePercent,
  );
  const amountConsistency =
    amounts.filter(
      (amount) => Math.abs(amount - typicalAmountInCents) <= amountTolerance,
    ).length / amounts.length;
  const dates = transactions
    .map((transaction) => parseDate(transaction.date))
    .filter((date): date is Date => date !== null);
  const {
    frequency,
    consistency: intervalConsistency,
    precision: intervalPrecision,
  } =
    dates.length >= 2
      ? getBestFrequency(dates, options)
      : { frequency: null, consistency: 0, precision: 0 };
  const categoryRatio = categoryConsistency(transactions);
  const score =
    intervalConsistency * 0.5 +
    intervalPrecision * 0.15 +
    amountConsistency * 0.3 +
    categoryRatio * 0.05;
  const qualifies = transactions.length >= 3 && frequency !== null;
  const confidence: RecurrenceConfidence = !qualifies
    ? "low"
    : score >= 0.95 &&
        intervalConsistency >= 0.95 &&
        intervalPrecision >= 0.75 &&
        amountConsistency >= 0.95
      ? "high"
      : score >= 0.8 &&
          intervalConsistency >= 0.8 &&
          amountConsistency >= 0.8
        ? "medium"
        : "low";

  return {
    ...group,
    frequency: qualifies ? frequency : null,
    confidence,
    score,
    intervalConsistency,
    intervalPrecision,
    amountConsistency,
    categoryConsistency: categoryRatio,
    transactionIds: transactions.map((transaction) => transaction.id),
    typicalAmountInCents,
  };
}

export function detectRecurringTransactions(
  transactions: Transaction[] = [],
  options: Partial<RecurringDetectionOptions> = {},
): RecurringGroup[] {
  const detectionOptions = {
    ...DEFAULT_RECURRING_DETECTION_OPTIONS,
    ...options,
  };
  const groups = new Map<string, TransactionGroup>();

  for (const transaction of transactions) {
    if (!parseDate(transaction.date)) continue;
    const key = getRecurringGroupKey(transaction);
    if (!key) continue;

    const [normalizedDescription, type] = JSON.parse(key) as [
      string,
      "income" | "expense",
    ];
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        normalizedDescription,
        type,
        transactions: [],
      };
      groups.set(key, group);
    }
    group.transactions.push(transaction);
  }

  return [...groups.values()].map((group) =>
    analyzeGroup(group, detectionOptions),
  );
}
