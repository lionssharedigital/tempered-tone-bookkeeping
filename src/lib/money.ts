export function centsToDollarsString(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Parses a user-entered amount like "1,234.56", "-42", "$42.00" into integer cents. */
export function dollarsStringToCents(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || Number.isNaN(Number(cleaned))) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  return Math.round(Number(cleaned) * 100);
}
