import { createHash } from "node:crypto";

export function computeDedupHash(input: {
  accountId: number;
  date: string;
  payee: string;
  amountCents: number;
  reference: string | null | undefined;
}): string {
  const normalized = [
    input.accountId,
    input.date,
    input.payee.trim().toLowerCase(),
    input.amountCents,
    (input.reference ?? "").trim().toLowerCase(),
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex");
}
