import { describe, expect, it } from "vitest";
import type { Transaction } from "@/types/types";
import {
  detectRecurringTransactions,
  getRecurringGroupKey,
  normalizeRecurringDescription,
} from "@/utils/recurring";

function transaction(
  id: string,
  date: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    accountId: "account-1",
    categoryId: "utilities",
    amountInCents: -10_000,
    date,
    description: "Electric Company",
    ...overrides,
  };
}

describe("recurring transaction detection", () => {
  it("normalizes whitespace, case, and trailing references or numbers", () => {
    expect(normalizeRecurringDescription("  ELECTRIC   COMPANY ref: ABC123 ")).toBe(
      "electric company",
    );
    expect(normalizeRecurringDescription("7-Eleven REF ABC")).toBe("7-eleven");
    expect(
      getRecurringGroupKey(
        transaction("one", "2026-01-01", { description: "Electric Company 8841" }),
      ),
    ).toBe(
      getRecurringGroupKey(
        transaction("two", "2026-01-01", { description: " electric   company " }),
      ),
    );
  });

  it("detects monthly transactions with end-of-month dates in arbitrary input order", () => {
    const groups = detectRecurringTransactions([
      transaction("mar", "2026-03-31"),
      transaction("jan", "2026-01-31"),
      transaction("feb", "2026-02-28"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      frequency: "monthly",
      confidence: "high",
      transactionIds: ["jan", "feb", "mar"],
      typicalAmountInCents: 10_000,
    });
  });

  it.each([
    ["weekly", ["2026-01-01", "2026-01-08", "2026-01-15"]],
    ["bi-weekly", ["2026-01-01", "2026-01-15", "2026-01-29"]],
    ["yearly", ["2024-02-29", "2025-02-28", "2026-02-28"]],
  ] as const)("detects %s cadence", (frequency, dates) => {
    const groups = detectRecurringTransactions(
      dates.map((date, index) => transaction(`tx-${index}`, date)),
    );
    expect(groups[0]).toMatchObject({
      frequency,
      confidence: "high",
    });
  });

  it("allows small amount changes and uses category consistency as supporting evidence", () => {
    const groups = detectRecurringTransactions([
      transaction("jan", "2026-01-15", { amountInCents: -10_000 }),
      transaction("feb", "2026-02-15", { amountInCents: -10_400 }),
      transaction("mar", "2026-03-15", { amountInCents: -9_800 }),
    ]);

    expect(groups[0]).toMatchObject({
      frequency: "monthly",
      confidence: "high",
      categoryConsistency: 1,
      amountConsistency: 1,
    });
  });

  it("uses medium confidence for consistently drifting monthly dates", () => {
    const [group] = detectRecurringTransactions([
      transaction("jan", "2026-01-01"),
      transaction("feb", "2026-02-05"),
      transaction("mar", "2026-03-01"),
      transaction("apr", "2026-04-05"),
    ]);

    expect(group).toMatchObject({
      frequency: "monthly",
      confidence: "medium",
      intervalConsistency: 1,
    });
  });

  it("assigns low confidence when amount variance exceeds configured tolerance", () => {
    const [group] = detectRecurringTransactions(
      [
        transaction("jan", "2026-01-15", { amountInCents: -10_000 }),
        transaction("feb", "2026-02-15", { amountInCents: -10_000 }),
        transaction("mar", "2026-03-15", { amountInCents: -30_000 }),
      ],
      { amountToleranceCents: 100, amountTolerancePercent: 0 },
    );

    expect(group.confidence).toBe("low");
    expect(group.amountConsistency).toBeLessThan(1);
  });

  it("does not flag one-off transactions or groups with only two occurrences", () => {
    expect(detectRecurringTransactions([])).toEqual([]);
    expect(
      detectRecurringTransactions([transaction("one", "2026-01-01")])[0],
    ).toMatchObject({ frequency: null, confidence: "low" });
    expect(
      detectRecurringTransactions([
        transaction("one", "2026-01-01"),
        transaction("two", "2026-02-01"),
      ])[0],
    ).toMatchObject({ frequency: null, confidence: "low" });
  });

  it("does not flag irregular gaps", () => {
    const [group] = detectRecurringTransactions([
      transaction("one", "2026-01-01"),
      transaction("two", "2026-01-08"),
      transaction("three", "2026-02-20"),
      transaction("four", "2026-04-15"),
    ]);

    expect(group.confidence).toBe("low");
  });

  it("keeps income and expenses in separate groups", () => {
    const groups = detectRecurringTransactions([
      transaction("e1", "2026-01-01"),
      transaction("e2", "2026-02-01"),
      transaction("e3", "2026-03-01"),
      transaction("i1", "2026-01-01", { amountInCents: 10_000 }),
      transaction("i2", "2026-02-01", { amountInCents: 10_000 }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.type === "expense")).toMatchObject({
      confidence: "high",
    });
    expect(groups.find((group) => group.type === "income")).toMatchObject({
      frequency: null,
      confidence: "low",
    });
  });
});
