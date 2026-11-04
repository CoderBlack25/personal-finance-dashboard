import { useEffect, useRef, useState } from "react";
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

  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ReturnType<
    typeof parseCsv
  > | null>(null);
  const [validationResult, setValidationResult] = useState<ReturnType<
    typeof validateCsvRows
  > | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [operationError, setOperationError] = useState<string | null>(null);
  const readerRef = useRef<FileReader | null>(null);

  useEffect(
    () => () => {
      if (readerRef.current?.readyState === FileReader.LOADING) {
        readerRef.current.onload = null;
        readerRef.current.onerror = null;
        readerRef.current.onabort = null;
        readerRef.current.abort();
      }
    },
    [],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) return;

    event.target.value = "";
    if (readerRef.current?.readyState === FileReader.LOADING) {
      readerRef.current.onload = null;
      readerRef.current.onerror = null;
      readerRef.current.onabort = null;
      readerRef.current.abort();
    }

    setFile(selectedFile);
    setParseResult(null);
    setValidationResult(null);
    setImportedCount(0);
    setOperationError(null);
    setIsReading(true);

    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setOperationError("Could not read the selected file. Try another CSV file.");
        setIsReading(false);
        return;
      }

      try {
        const result = parseCsv(reader.result);
        setParseResult(result);
        setValidationResult(
          result.rows.length > 0
            ? validateCsvRows(result.rows, result.headers)
            : null,
        );
      } catch {
        setOperationError(
          "Could not process the selected file. Check that it is a valid CSV and try again.",
        );
      } finally {
        setIsReading(false);
      }
    };
    reader.onerror = () => {
      setOperationError(
        "Could not read the selected file. Check file access and try again.",
      );
      setIsReading(false);
    };
    reader.onabort = () => {
      setOperationError("Reading the selected file was cancelled. Try again.");
      setIsReading(false);
    };

    try {
      reader.readAsText(selectedFile);
    } catch {
      setOperationError(
        "Could not read the selected file. Check file access and try again.",
      );
      setIsReading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedAccountId || !validationResult) return;

    const validRows = validationResult.valid;
    if (validRows.length === 0) return;

    setImporting(true);
    setOperationError(null);
    try {
      const inputTransactions = validRows.map((row) => ({
        date: row.date,
        amountInCents: parseCsvAmount(row.amount),
        description: row.description ?? "",
        categoryId: null,
      }));

      const imported = await importTransactions({
        accountId: selectedAccountId,
        transactions: inputTransactions,
      });
      if (!imported) {
        setOperationError(
          "Import failed. Your transactions were not imported. Check that browser storage is available and try again.",
        );
        return;
      }

      setImportedCount(validRows.length);
      setFile(null);
      setParseResult(null);
      setValidationResult(null);
    } catch {
      setOperationError(
        "Import failed. Your transactions were not imported. Check that browser storage is available and try again.",
      );
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
          {operationError && (
            <Alert variant="destructive" className="mt-4">
              {operationError}
            </Alert>
          )}
          {importedCount > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm text-foreground">
                Successfully imported {importedCount} transaction(s).
              </span>
            </div>
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

      {isReading && (
        <p role="status" className="text-sm text-muted-foreground">
          Reading file…
        </p>
      )}
      {operationError && (
        <Alert variant="destructive">{operationError}</Alert>
      )}
      <label className="block">
        <span className="text-sm font-medium text-foreground">
          Choose another CSV file
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

      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">
          {validCount} valid, {invalidCount} invalid
        </span>
        <Button
          type="button"
          onClick={handleImport}
          disabled={
            isReading ||
            importing ||
            validCount === 0 ||
            !selectedAccountId
          }
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

      {parseResult?.errors.map((parseError, index) => (
        <Alert
          key={`${parseError.rowNumber}-${index}`}
          variant="destructive"
        >
          {parseError.rowNumber > 0
            ? `Row ${parseError.rowNumber}: ${parseError.message}`
            : parseError.message}
        </Alert>
      ))}

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
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <span className="text-sm text-foreground">
            Successfully imported {importedCount} transaction(s).
          </span>
        </div>
      )}

    </section>
  );
}
