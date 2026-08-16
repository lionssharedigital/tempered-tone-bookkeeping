import { and, eq, lte } from "drizzle-orm";
import { db } from "../../../db/client";
import { accounts, transactions } from "../../../db/schema";

export interface BalanceSheetAccountRow {
  accountId: number;
  name: string;
  openingBalanceCents: number;
  activityCents: number;
  endingBalanceCents: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: BalanceSheetAccountRow[];
  liabilities: BalanceSheetAccountRow[];
  totalAssetsOpening: number;
  totalAssetsActivity: number;
  totalAssetsEnding: number;
  totalLiabilitiesOpening: number;
  totalLiabilitiesActivity: number;
  totalLiabilitiesEnding: number;
  beginningEquity: number;
  netChangeInCash: number;
  totalEquity: number;
  totalLiabilitiesPlusEquity: number;
}

/**
 * Balance Sheet is computed on read: opening balance (entered per account)
 * plus all transaction activity up to the as-of date. Mirrors the original
 * sheet's Assets/Liabilities/Equity layout.
 */
export function getBalanceSheet(asOfDate: string): BalanceSheetReport {
  const allAccounts = db.select().from(accounts).where(eq(accounts.isArchived, false)).all();

  const rows: BalanceSheetAccountRow[] = allAccounts.map((account) => {
    const activityCents = db
      .select({ amountCents: transactions.amountCents })
      .from(transactions)
      .where(and(eq(transactions.accountId, account.id), lte(transactions.date, asOfDate)))
      .all()
      .reduce((sum, t) => sum + t.amountCents, 0);

    return {
      accountId: account.id,
      name: account.name,
      openingBalanceCents: account.openingBalanceCents,
      activityCents,
      endingBalanceCents: account.openingBalanceCents + activityCents,
    };
  });

  const accountTypeById = new Map(allAccounts.map((a) => [a.id, a.accountType]));
  const assets = rows.filter((r) => accountTypeById.get(r.accountId) === "bank");
  const liabilities = rows.filter((r) => accountTypeById.get(r.accountId) === "credit_card");

  const sum = (rows: BalanceSheetAccountRow[], key: keyof BalanceSheetAccountRow) =>
    rows.reduce((s, r) => s + (r[key] as number), 0);

  const totalAssetsOpening = sum(assets, "openingBalanceCents");
  const totalAssetsActivity = sum(assets, "activityCents");
  const totalAssetsEnding = sum(assets, "endingBalanceCents");
  const totalLiabilitiesOpening = sum(liabilities, "openingBalanceCents");
  const totalLiabilitiesActivity = sum(liabilities, "activityCents");
  const totalLiabilitiesEnding = sum(liabilities, "endingBalanceCents");

  const beginningEquity = totalAssetsOpening - totalLiabilitiesOpening;
  const netChangeInCash = totalAssetsActivity - totalLiabilitiesActivity;
  const totalEquity = beginningEquity + netChangeInCash;

  return {
    asOfDate,
    assets,
    liabilities,
    totalAssetsOpening,
    totalAssetsActivity,
    totalAssetsEnding,
    totalLiabilitiesOpening,
    totalLiabilitiesActivity,
    totalLiabilitiesEnding,
    beginningEquity,
    netChangeInCash,
    totalEquity,
    totalLiabilitiesPlusEquity: totalLiabilitiesEnding + totalEquity,
  };
}
