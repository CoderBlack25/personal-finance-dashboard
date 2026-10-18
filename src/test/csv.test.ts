import { describe, expect, it } from "vitest";
import { parseCsv } from "@/utils/csv";
import {
  validateCsvRows,
  parseCsvAmount,
  isValidDate,
} from "@/schemas/csvSchema";

describe("parseCsv", () => {
  it("parses a standard CSV with date, amount, description columns", () => {
    const csv = `Date,Amount,Description
2026-08-01,-50.00,Groceries
2026-08-05,1200.00,Salary
2026-08-10,-15.50,Coffee`;

    const result = parseCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      date: "2026-08-01",
      amount: "-50.00",
      description: "Groceries",
    });
    expect(result.rows[1]).toMatchObject({
      rowNumber: 3,
      date: "2026-08-05",
      amount: "1200.00",
      description: "Salary",
    });
    expect(result.rows[2]).toMatchObject({
      rowNumber: 4,
      date: "2026-08-10",
      amount: "-15.50",
      description: "Coffee",
    });
  });

  it("handles variable column order", () => {
    const csv = `Description,Date,Amount
Groceries,2026-08-01,-50.00
Salary,2026-08-05,1200.00`;

    const result = parseCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      date: "2026-08-01",
      amount: "-50.00",
      description: "Groceries",
    });
    expect(result.rows[1]).toMatchObject({
      date: "2026-08-05",
      amount: "1200.00",
      description: "Salary",
    });
  });

  it("handles extra columns", () => {
    const csv = `Date,Amount,Description,Category,Account
2026-08-01,-50.00,Groceries,Food,Checking`;

    const result = parseCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].raw).toHaveLength(5);
  });

  it("reports error when no date column is found", () => {
    const csv = `Amount,Description
-50.00,Groceries`;

    const result = parseCsv(csv);

    expect(result.errors.some((e) => e.message.includes("date column"))).toBe(
      true,
    );
    expect(result.rows[0].date).toBeNull();
  });

  it("reports error when no amount column is found", () => {
    const csv = `Date,Description
2026-08-01,Groceries`;

    const result = parseCsv(csv);

    expect(result.errors.some((e) => e.message.includes("amount column"))).toBe(
      true,
    );
    expect(result.rows[0].amount).toBeNull();
  });

  it("returns error for empty CSV", () => {
    const result = parseCsv("");

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it("returns error for CSV with only header", () => {
    const result = parseCsv("Date,Amount,Description");

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toEqual([]);
  });

  it("handles quoted fields containing commas", () => {
    const csv = `Date,Amount,Description
2026-08-01,-50.00,"Groceries, weekly"`;

    const result = parseCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].description).toBe("Groceries, weekly");
  });

  it("trims whitespace from fields", () => {
    const csv = ` Date , Amount , Description 
 2026-08-01 , -50.00 , Groceries `;

    const result = parseCsv(csv);

    expect(result.rows[0]).toMatchObject({
      date: "2026-08-01",
      amount: "-50.00",
      description: "Groceries",
    });
  });
});

describe("validateCsvRows", () => {
  const headers = ["Date", "Amount", "Description"];

  it("validates well-formed rows", () => {
    const rows = [
      {
        rowNumber: 2,
        date: "2026-08-01",
        amount: "-50.00",
        description: "Groceries",
        raw: ["2026-08-01", "-50.00", "Groceries"],
      },
    ];

    const result = validateCsvRows(rows, headers);

    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid[0].date).toBe("2026-08-01");
    expect(result.valid[0].amount).toBe("-50.00");
  });

  it("rejects rows with bad date format", () => {
    const rows = [
      {
        rowNumber: 2,
        date: "08/01/2026",
        amount: "-50.00",
        description: "Groceries",
        raw: ["08/01/2026", "-50.00", "Groceries"],
      },
    ];

    const result = validateCsvRows(rows, headers);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].rowNumber).toBe(2);
    expect(result.invalid[0].errors.some((e) => e.message.includes("Date"))).toBe(
      true,
    );
  });

  it("rejects rows with missing date", () => {
    const rows = [
      {
        rowNumber: 2,
        date: null,
        amount: "-50.00",
        description: "Groceries",
        raw: ["", "-50.00", "Groceries"],
      },
    ];

    const result = validateCsvRows(rows, headers);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
  });

  it("rejects rows with invalid amount", () => {
    const rows = [
      {
        rowNumber: 2,
        date: "2026-08-01",
        amount: "not-a-number",
        description: "Groceries",
        raw: ["2026-08-01", "not-a-number", "Groceries"],
      },
    ];

    const result = validateCsvRows(rows, headers);

    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].errors.some((e) => e.message.includes("amount"))).toBe(
      true,
    );
  });

  it("handles empty description as null", () => {
    const rows = [
      {
        rowNumber: 2,
        date: "2026-08-01",
        amount: "-50.00",
        description: null,
        raw: ["2026-08-01", "-50.00", ""],
      },
    ];

    const result = validateCsvRows(rows, headers);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].description).toBeNull();
  });
});

describe("parseCsvAmount", () => {
  it("parses positive amounts", () => {
    expect(parseCsvAmount("1200.00")).toBe(120000);
    expect(parseCsvAmount("42.50")).toBe(4250);
    expect(parseCsvAmount("100")).toBe(10000);
  });

  it("parses negative amounts", () => {
    expect(parseCsvAmount("-50.00")).toBe(-5000);
    expect(parseCsvAmount("-19.99")).toBe(-1999);
  });

  it("handles amounts with currency symbols", () => {
    expect(parseCsvAmount("$1,200.00")).toBe(120000);
  });

  it("rounds to nearest cent", () => {
    expect(parseCsvAmount("10.005")).toBe(1001);
  });
});

describe("isValidDate", () => {
  it("accepts valid ISO dates", () => {
    expect(isValidDate("2026-08-01")).toBe(true);
    expect(isValidDate("2026-12-31")).toBe(true);
  });

  it("rejects invalid dates", () => {
    expect(isValidDate("08/01/2026")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});
