import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { categories, categoryMapRules, transactions } from "../../../db/schema";
import { matchCategoryRule } from "@/lib/category-matcher";
import { computeDedupHash } from "@/lib/dedup";
import { parseAmountToCents, parseDateToIso } from "@/lib/csv/parse";

export interface RawImportRow {
  date: string;
  payee: string;
  amount: string;
  description?: string;
  reference?: string;
  bankTransactionType?: string;
  status?: string;
}

export interface PreviewRow {
  rowIndex: number;
  date: string | null;
  payee: string;
  amountCents: number | null;
  description: string | null;
  reference: string | null;
  bankTransactionType: string | null;
  status: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryType: string | null;
  matchedRuleId: number | null;
  dedupHash: string | null;
  isDuplicate: boolean;
  error: string | null;
  accepted: boolean;
}

export function buildPreviewRows(accountId: number, rawRows: RawImportRow[]): PreviewRow[] {
  const rules = db.select().from(categoryMapRules).all();
  const categoryById = new Map(db.select().from(categories).all().map((c) => [c.id, c]));

  const existingHashes = new Set(
    db
      .select({ dedupHash: transactions.dedupHash })
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .all()
      .map((r) => r.dedupHash),
  );

  return rawRows.map((raw, rowIndex) => {
    const payee = raw.payee?.trim() ?? "";
    let date: string | null = null;
    let amountCents: number | null = null;
    let error: string | null = null;

    try {
      date = parseDateToIso(raw.date ?? "");
    } catch {
      error = `Invalid date: "${raw.date}"`;
    }
    try {
      amountCents = parseAmountToCents(raw.amount ?? "");
    } catch {
      error = error ?? `Invalid amount: "${raw.amount}"`;
    }
    if (!payee) {
      error = error ?? "Missing payee";
    }

    let categoryId: number | null = null;
    let categoryName: string | null = null;
    let categoryType: string | null = null;
    let matchedRuleId: number | null = null;
    if (payee) {
      const match = matchCategoryRule(payee, rules);
      if (match) {
        const category = categoryById.get(match.categoryId);
        categoryId = match.categoryId;
        categoryName = category?.name ?? null;
        categoryType = category?.type ?? null;
        matchedRuleId = match.id;
      }
    }

    let dedupHash: string | null = null;
    let isDuplicate = false;
    if (date && amountCents !== null && payee) {
      dedupHash = computeDedupHash({
        accountId,
        date,
        payee,
        amountCents,
        reference: raw.reference,
      });
      isDuplicate = existingHashes.has(dedupHash);
    }

    return {
      rowIndex,
      date,
      payee,
      amountCents,
      description: raw.description?.trim() || null,
      reference: raw.reference?.trim() || null,
      bankTransactionType: raw.bankTransactionType?.trim() || null,
      status: raw.status?.trim() || null,
      categoryId,
      categoryName,
      categoryType,
      matchedRuleId,
      dedupHash,
      isDuplicate,
      error,
      accepted: !error && !isDuplicate,
    };
  });
}
