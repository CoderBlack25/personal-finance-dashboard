import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const csvRowSchema = z.object({
  date: z.string().regex(DATE_REGEX, "Date must be in YYYY-MM-DD format."),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine(
      (val) => {
        const cleaned = val.replace(/[$,]/g, "");
        return /^-?\d+(\.\d{1,2})?$/.test(cleaned);
      },
      "Enter a valid amount, like 42.50 or -19.99.",
    ),
  description: z.string().nullable().optional(),
});

export type ValidatedCsvRow = z.infer<typeof csvRowSchema>;

export interface CsvValidationResult {
  valid: ValidatedCsvRow[];
  invalid: CsvInvalidRow[];
}

export interface CsvInvalidRow {
  rowNumber: number;
  errors: z.ZodIssue[];
  raw: Record<string, string>;
}

export function validateCsvRows(
  rows: Array<{ rowNumber: number; date: string | null; amount: string | null; description: string | null; raw: string[] }>,
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
  return Math.round(Number(cleaned) * 100);
}

export function isValidDate(dateString: string): boolean {
  if (!DATE_REGEX.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
