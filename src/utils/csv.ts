export interface ParsedCsvRow {
  rowNumber: number;
  date: string | null;
  amount: string | null;
  description: string | null;
  raw: string[];
}

export interface CsvParseResult {
  headers: string[];
  rows: ParsedCsvRow[];
  errors: CsvParseError[];
}

export interface CsvParseError {
  rowNumber: number;
  column: string | null;
  message: string;
}

const DATE_COLUMN_KEYWORDS = ["date", "transaction date", "posted date", "value date"];
const AMOUNT_COLUMN_KEYWORDS = ["amount", "transaction amount", "debit", "credit", "value"];
const DESCRIPTION_COLUMN_KEYWORDS = ["description", "memo", "payee", "narration", "details"];

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

function detectColumnType(
  header: string,
  sampleValues: string[],
): "date" | "amount" | "description" | "unknown" {
  const normalizedHeader = header.toLowerCase().trim();

  if (DATE_COLUMN_KEYWORDS.some((kw) => normalizedHeader.includes(kw))) {
    return "date";
  }
  if (AMOUNT_COLUMN_KEYWORDS.some((kw) => normalizedHeader.includes(kw))) {
    return "amount";
  }
  if (DESCRIPTION_COLUMN_KEYWORDS.some((kw) => normalizedHeader.includes(kw))) {
    return "description";
  }

  // Heuristic: if most sample values look like dates, it's a date column
  const dateLikeCount = sampleValues.filter((v) => /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(v.trim())).length;
  if (dateLikeCount >= Math.max(1, sampleValues.length * 0.5)) {
    return "date";
  }

  // Heuristic: if most sample values look like currency/amounts, it's an amount column
  const amountLikeCount = sampleValues.filter((v) => /^-?\d+([.,]\d{1,2})?$/.test(v.trim().replace(/[$,]/g, ""))).length;
  if (amountLikeCount >= Math.max(1, sampleValues.length * 0.5)) {
    return "amount";
  }

  return "description";
}

export function parseCsv(csvText: string): CsvParseResult {
  const errors: CsvParseError[] = [];

  // Normalize line endings
  const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  // Remove trailing empty line
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      errors: [{ rowNumber: 0, column: null, message: "CSV file is empty." }],
    };
  }

  // Parse header
  const headerFields = parseCsvLine(lines[0]).map((f) => f.trim().replace(/^"|"$/g, ""));
  if (headerFields.length === 0 || (headerFields.length === 1 && headerFields[0] === "")) {
    return {
      headers: [],
      rows: [],
      errors: [{ rowNumber: 1, column: null, message: "CSV file has no header row." }],
    };
  }

  // Collect sample values from first few data rows for heuristic detection
  const sampleValuesPerColumn: string[][] = headerFields.map(() => []);
  const dataRows: string[][] = [];

  for (let i = 1; i < Math.min(lines.length, 6); i++) {
    const fields = parseCsvLine(lines[i]);
    dataRows.push(fields);
    fields.forEach((field, idx) => {
      if (sampleValuesPerColumn[idx]) {
        sampleValuesPerColumn[idx].push(field.trim());
      }
    });
  }

  // Detect column types
  const columnTypes = headerFields.map((header, idx) =>
    detectColumnType(header, sampleValuesPerColumn[idx] ?? []),
  );

  const dateColIdx = columnTypes.indexOf("date");
  const amountColIdx = columnTypes.indexOf("amount");
  const descriptionColIdx = columnTypes.indexOf("description");

  if (dateColIdx === -1) {
    errors.push({ rowNumber: 1, column: null, message: "No date column found in CSV header." });
  }
  if (amountColIdx === -1) {
    errors.push({ rowNumber: 1, column: null, message: "No amount column found in CSV header." });
  }

  const rows: ParsedCsvRow[] = [];

  // Parse all data rows (starting from line 1, 0-indexed, so rowNumber = i + 1)
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const rowNumber = i + 1;

    // Skip completely empty rows
    if (fields.length === 1 && fields[0].trim() === "") {
      continue;
    }

    const getField = (colIdx: number): string | null => {
      if (colIdx === -1 || colIdx >= fields.length) {
        return null;
      }
      const value = fields[colIdx].trim();
      return value === "" ? null : value;
    };

    const date = dateColIdx !== -1 ? getField(dateColIdx) : null;
    const amount = amountColIdx !== -1 ? getField(amountColIdx) : null;
    const description = descriptionColIdx !== -1 ? getField(descriptionColIdx) : null;

    rows.push({ rowNumber, date, amount, description, raw: fields });
  }

  return { headers: headerFields, rows, errors };
}
