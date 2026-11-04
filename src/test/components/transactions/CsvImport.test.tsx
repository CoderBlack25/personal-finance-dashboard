/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CsvImport } from "@/components/transactions/CsvImport";
import { useFinanceStore } from "@/store/store";

vi.mock("@/store/store", () => {
  const useFinanceStore = vi.fn() as any;
  return { useFinanceStore };
});

describe("CsvImport", () => {
  const mockImportTransactions = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockImportTransactions.mockReset();
    vi.mocked(useFinanceStore).mockImplementation((selector: any) =>
      selector({
        selectedAccountId: "account-1",
        importTransactions: mockImportTransactions,
      }),
    );
  });

  it("shows a clear error when the selected file cannot be read", async () => {
    const user = userEvent.setup();
    vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (
      this: FileReader,
    ) {
      this.dispatchEvent(new ProgressEvent("error"));
    });

    render(<CsvImport />);
    await user.upload(
      screen.getByLabelText("Select CSV file"),
      new File(["unreadable"], "bank.csv", { type: "text/csv" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not read the selected file/i,
    );
    expect(screen.getByText("File: bank.csv")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose another CSV file")).toBeInTheDocument();
  });

  it("keeps the preview and explains when the store rejects an import", async () => {
    const user = userEvent.setup();
    vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (
      this: FileReader,
    ) {
      Object.defineProperty(this, "result", {
        configurable: true,
        value: "Date,Amount,Description\n2026-08-01,-5.00,Coffee",
      });
      this.dispatchEvent(new ProgressEvent("load"));
    });
    mockImportTransactions.mockResolvedValue(false);

    render(<CsvImport />);
    await user.upload(
      screen.getByLabelText("Select CSV file"),
      new File(["csv"], "bank.csv", { type: "text/csv" }),
    );
    await screen.findByText("Coffee");
    await user.click(screen.getByRole("button", { name: /import 1 transaction/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /import failed.*transactions were not imported/i,
    );
    expect(screen.getByText("File: bank.csv")).toBeInTheDocument();
    expect(screen.getByText("Coffee")).toBeInTheDocument();
  });

  it("clears the preview and shows confirmation after a successful import", async () => {
    const user = userEvent.setup();
    vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (
      this: FileReader,
    ) {
      Object.defineProperty(this, "result", {
        configurable: true,
        value: "Date,Amount,Description\n2026-08-01,-5.00,Coffee",
      });
      this.dispatchEvent(new ProgressEvent("load"));
    });
    mockImportTransactions.mockResolvedValue(true);

    render(<CsvImport />);
    await user.upload(
      screen.getByLabelText("Select CSV file"),
      new File(["csv"], "bank.csv", { type: "text/csv" }),
    );
    await screen.findByText("Coffee");
    await user.click(screen.getByRole("button", { name: /import 1 transaction/i }));

    expect(
      await screen.findByText("Successfully imported 1 transaction(s)."),
    ).toBeInTheDocument();
    expect(screen.queryByText("File: bank.csv")).not.toBeInTheDocument();
    expect(mockImportTransactions).toHaveBeenCalledWith({
      accountId: "account-1",
      transactions: [
        {
          date: "2026-08-01",
          amountInCents: -500,
          description: "Coffee",
          categoryId: null,
        },
      ],
    });
  });
});
