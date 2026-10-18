import { useState } from "react";
import { useFinanceStore } from "@/store/store";
import { parseCsv } from "@/utils/csv";
import { validateCsvRows, parseCsvAmount } from "@/schemas/csvSchema";
import { formatCentsToDollar } from "@/utils/money";

export function CsvImport() {
  const selectedAccountId = useFinanceStore((state) => state.selectedAccountId);
  const importTransactions = useFinanceStore((state) => state.importTransactions);
  const loadAllTransactions = useFinanceStore((state) => state.loadAllTransactions);
  const error = useFinanceStore((state) => state.error);

  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [validationResult, setValidationResult] = useState<
    ReturnType<typeof validateCsvRows> | null
  >(null);
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
      <section className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Import transactions from CSV</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Export transactions from your bank and upload the CSV file here. The
          importer will detect date, amount, and description columns
          automatically.
        </p>
        <label className="block">
          <span className="text-sm font-medium">Select CSV file</span>
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
        {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
      </section>
    );
  }

  const validCount = validationResult?.valid.length ?? 0;
  const invalidCount = validationResult?.invalid.length ?? 0;

  return (
    <section className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">Import transactions from CSV</h2>
      <p className="text-sm text-muted-foreground">
        File: {file?.name}
      </p>

      <div className="flex items-center gap-2">
        <span className="text-sm">
          {validCount} valid, {invalidCount} invalid
        </span>
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || validCount === 0 || !selectedAccountId}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            validCount === 0 || !selectedAccountId || importing
              ? "text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/80"
          }`}
        >
          {importing ? "Importing..." : `Import ${validCount} transaction(s)`}
        </button>
      </div>

      {invalidCount > 0 && validationResult && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-3">
          <h3 className="text-sm font-medium text-destructive mb-2">
            {invalidCount} row(s) failed validation
          </h3>
          <ul className="text-xs text-destructive space-y-1">
            {validationResult.invalid.map((invalid) => (
              <li key={invalid.rowNumber}>
                Row {invalid.rowNumber}:{" "}
                {invalid.errors.map((e) => e.message).join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="text-left text-muted-foreground pb-2">
              Row
            </th>
            <th scope="col" className="text-left text-muted-foreground pb-2">
              Date
            </th>
            <th scope="col" className="text-right text-muted-foreground pb-2">
              Amount
            </th>
            <th scope="col" className="text-left text-muted-foreground pb-2">
              Description
            </th>
            <th scope="col" className="text-right text-muted-foreground pb-2">
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
                  isValidRow ? "" : "bg-destructive/10"
                }`}
              >
                <td className="py-2 text-muted-foreground">#{row.rowNumber}</td>
                <td className="py-2 font-mono">
                  {row.date ?? "-"}
                  {!row.date && (
                    <span className="text-destructive text-xs ml-1">
                      (missing)
                    </span>
                  )}
                </td>
                <td className="py-2 text-right font-mono">
                  {row.amount ? formatCentsToDollar(parseCsvAmount(row.amount)) : "-"}
                  {!row.amount && (
                    <span className="text-destructive text-xs ml-1">
                      (missing)
                    </span>
                  )}
                </td>
                <td className="py-2">{row.description ?? "-"}</td>
                <td className="py-2 text-right">
                  <span
                    className={`text-xs font-medium ${
                      isValidRow
                        ? "text-green-600"
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

      {importedCount > 0 && (
        <p className="text-sm text-green-600" role="status">
          Successfully imported {importedCount} transaction(s).
        </p>
      )}

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </section>
  );
}
