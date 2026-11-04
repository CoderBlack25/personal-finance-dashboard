import { z } from "zod";
import { dollarsStringToCents } from "@/utils/money";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const csvRowSchema = z.object({
  date: z
    .string()
    .refine(
      isValidDate,
      "Date must be a valid calendar date in YYYY-MM-DD format.",
    ),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine((val) => {
      const cleaned = val.replace(/[$,]/g, "");
      return /^-?\d+(\.\d{1,2})?$/.test(cleaned);
    }, "Enter a valid amount, like 42.50 or -19.99."),
  description: z.string().nullable().optional(),
});

export type ValidatedCsvRow = z.infer<typeof csvRowSchema>;

export interface CsvValidationResult {
  valid: ValidatedCsvRow[];
  invalid: CsvInvalidRow[];
}

export interface CsvInvalidRow {
  rowNumber: number;
  errors: z.core.$ZodIssue[];
  raw: Record<string, string>;
}

export function validateCsvRows(
  rows: Array<{
    rowNumber: number;
    date: string | null;
    amount: string | null;
    description: string | null;
    raw: string[];
  }>,
  headers: string[],
): CsvValidationResult {
  const valid: ValidatedCsvRow[] = [];
  const invalid: CsvInvalidRow[] = [];

  for (const row of rows) {
    const rawRecord: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (idx < row.raw.length) {
        rawRecord[header] = row.raw[idx];
      }
    });

    const result = csvRowSchema.safeParse({
      date: row.date ?? "",
      amount: row.amount ?? "",
      description: row.description ?? null,
    });

    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        rowNumber: row.rowNumber,
        errors: result.error.issues,
        raw: rawRecord,
      });
    }
  }

  return { valid, invalid };
}

export function parseCsvAmount(amount: string): number {
  const cleaned = amount.replace(/[$,]/g, "");
  return dollarsStringToCents(cleaned);
}

export function isValidDate(dateString: string): boolean {
  const match = DATE_REGEX.exec(dateString);
  if (!match) {
    return false;
  }

  const year = Number(match[0].slice(0, 4));
  const month = Number(match[0].slice(5, 7));
  const day = Number(match[0].slice(8, 10));
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= daysInMonth[month - 1];
}
