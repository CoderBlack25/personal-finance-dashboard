import { describe, expect, it } from "vitest";
import { formatAccessibleMoney } from "@/utils/money";

describe("formatAccessibleMoney", () => {
  it.each([
    [120000, "Positive 1,200 dollars and 0 cents USD"],
    [1, "Positive 0 dollars and 1 cent USD"],
    [-4250, "Negative 42 dollars and 50 cents USD"],
    [-1, "Negative 0 dollars and 1 cent USD"],
    [0, "Zero 0 dollars and 0 cents USD"],
  ])("formats %i cents accessibly", (amountInCents, expected) => {
    expect(formatAccessibleMoney(amountInCents)).toBe(expected);
  });
});
