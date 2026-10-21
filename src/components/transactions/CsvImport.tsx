import { useState } from "react";
import { useFinanceStore } from "@/store/store";
import { parseCsv } from "@/utils/csv";
import { validateCsvRows, parseCsvAmount } from "@/schemas/csvSchema";
import { formatCentsToDollar } from "@/utils/money";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Upload, FileText } from "lucide-react";

export function CsvImport() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const importTransactions = useFinanceStore(
    (state) => state.importTransactions,
  );
  const loadAllTransactions = useFinanceStore(
    (state) => state.loadAllTransactions,
  );
  const error = useFinanceStore((state) => state.error);

  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ReturnType<
    typeof parseCsv
  > | null>(null);
  const [validationResult, setValidationResult] = useState<ReturnType<
    typeof validateCsvRows
  > | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseResult(null);
    setValidationResult(null);
    setImportedCount(0);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = parseCsv(text);
      setParseResult(result);

      if (result.rows.length > 0) {
        const validation = validateCsvRows(result.rows, result.headers);
        setValidationResult(validation);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!selectedAccountId || !validationResult) return;

    const validRows = validationResult.valid;
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const inputTransactions = validRows.map((row) => ({
        date: row.date,
        amountInCents: parseCsvAmount(row.amount),
        description: row.description ?? "",
        categoryId: null,
      }));

      await importTransactions({
        accountId: selectedAccountId,
        transactions: inputTransactions,
      });

      await loadAllTransactions();
      setImportedCount(validRows.length);
      setFile(null);
      setParseResult(null);
      setValidationResult(null);
    } catch {
      // Error already set by store
    } finally {
      setImporting(false);
    }
  };

  if (!file && !parseResult) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-4">
            <Upload className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">
            Import transactions from CSV
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Export transactions from your bank and upload the CSV file here. The
            importer will detect date, amount, and description columns
            automatically.
          </p>
        </div>

        <div className="mt-6">
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Select CSV file
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                file:text-sm file:font-semibold file:bg-primary
                file:text-primary-foreground hover:file:bg-primary/80"
            />
          </label>
          {error && (
            <Alert variant="destructive" className="mt-4">
              {error}
            </Alert>
          )}
        </div>
      </section>
    );
  }

  const validCount = validationResult?.valid.length ?? 0;
  const invalidCount = validationResult?.invalid.length ?? 0;

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            Import transactions from CSV
          </h2>
          <p className="text-sm text-muted-foreground">File: {file?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">
          {validCount} valid, {invalidCount} invalid
        </span>
        <Button
          type="button"
          onClick={handleImport}
          disabled={importing || validCount === 0 || !selectedAccountId}
        >
          {importing ? "Importing..." : `Import ${validCount} transaction(s)`}
        </Button>
      </div>

      {invalidCount > 0 && validationResult && (
        <Alert
          variant="destructive"
          className="border-destructive/50 bg-destructive/5"
        >
          <strong className="text-sm font-medium">
            {invalidCount} row(s) failed validation
          </strong>
          <ul className="text-xs text-destructive mt-2 space-y-1">
            {validationResult.invalid.map((invalid) => (
              <li key={invalid.rowNumber}>
                Row {invalid.rowNumber}:{" "}
                {invalid.errors.map((e) => e.message).join("; ")}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="text-left text-xs text-muted-foreground pb-2 font-medium"
              >
                Row
              </th>
              <th
                scope="col"
                className="text-left text-xs text-muted-foreground pb-2 font-medium"
              >
                Date
              </th>
              <th
                scope="col"
                className="text-right text-xs text-muted-foreground pb-2 font-medium"
              >
                Amount
              </th>
              <th
                scope="col"
                className="text-left text-xs text-muted-foreground pb-2 font-medium"
              >
                Description
              </th>
              <th
                scope="col"
                className="text-right text-xs text-muted-foreground pb-2 font-medium"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {parseResult?.rows.map((row) => {
              const invalidRow = validationResult?.invalid.find(
                (r) => r.rowNumber === row.rowNumber,
              );
              const isValidRow = !invalidRow;

              return (
                <tr
                  key={row.rowNumber}
                  className={`border-b border-border ${
                    isValidRow ? "" : "bg-destructive/5"
                  }`}
                >
                  <td className="py-2 text-xs text-muted-foreground">
                    #{row.rowNumber}
                  </td>
                  <td className="py-2 font-mono tabular-nums text-xs">
                    {row.date ?? "-"}
                    {!row.date && (
                      <span className="text-destructive ml-1">(missing)</span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-xs">
                    {row.amount
                      ? formatCentsToDollar(parseCsvAmount(row.amount))
                      : "-"}
                    {!row.amount && (
                      <span className="text-destructive ml-1">(missing)</span>
                    )}
                  </td>
                  <td className="py-2 text-xs text-foreground">
                    {row.description ?? "-"}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={`text-xs font-medium ${
                        isValidRow
                          ? "text-success-foreground"
                          : "text-destructive"
                      }`}
                    >
                      {isValidRow ? "Valid" : "Invalid"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {importedCount > 0 && (
        <Alert variant="success" className="border-success/50 bg-success/5">
          Successfully imported {importedCount} transaction(s).
        </Alert>
      )}

      {error && (
        <Alert
          variant="destructive"
          className="border-destructive/50 bg-destructive/5"
        >
          {error}
        </Alert>
      )}
    </section>
  );
}
