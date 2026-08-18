import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../db/client";
import { transactions, categories } from "../../../db/schema";

export interface IncomeStatementLine {
  categoryId: number;
  categoryName: string;
  total: number; // cents, positive magnitude
}

export interface IncomeStatementReport {
  startDate: string;
  endDate: string;
  revenue: IncomeStatementLine[];
  revenueTotal: number;
  costOfSales: IncomeStatementLine[];
  costOfSalesTotal: number;
  grossProfit: number;
  operatingExpenses: IncomeStatementLine[];
  operatingExpensesTotal: number;
  netProfit: number;
}

/**
 * Income Statement is computed on read from the same transaction data as
 * the P&L, over an arbitrary date range. Categories typed "Cost of Sales"
 * are broken out from ordinary "Expense" categories so Gross Profit
 * (Revenue minus Cost of Sales) can be shown separately from Operating
 * Expenses, matching how a Cost of Goods Sold category is used in practice.
 */
export function getIncomeStatement(startDate: string, endDate: string): IncomeStatementReport {
  const rows = db
    .select({
      amountCents: transactions.amountCents,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryType: categories.type,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(gte(transactions.date, startDate), lte(transactions.date, endDate)))
    .all()
    .filter(
      (r) =>
        r.categoryType === "Income" ||
        r.categoryType === "Expense" ||
        r.categoryType === "Cost of Sales",
    );

  function group(type: "Income" | "Expense" | "Cost of Sales", flipSign: boolean): IncomeStatementLine[] {
    const byCategory = new Map<number, IncomeStatementLine>();
    for (const row of rows) {
      if (row.categoryType !== type) continue;
      if (!byCategory.has(row.categoryId)) {
        byCategory.set(row.categoryId, {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          total: 0,
        });
      }
      const entry = byCategory.get(row.categoryId)!;
      entry.total += flipSign ? -row.amountCents : row.amountCents;
    }
    return Array.from(byCategory.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  const revenue = group("Income", false);
  // Expense and Cost of Sales amounts are stored as negative cents
  // (outflows); flip sign so the UI displays a positive magnitude.
  const costOfSales = group("Cost of Sales", true);
  const operatingExpenses = group("Expense", true);

  const sum = (lines: IncomeStatementLine[]) => lines.reduce((s, l) => s + l.total, 0);
  const revenueTotal = sum(revenue);
  const costOfSalesTotal = sum(costOfSales);
  const operatingExpensesTotal = sum(operatingExpenses);
  const grossProfit = revenueTotal - costOfSalesTotal;
  const netProfit = grossProfit - operatingExpensesTotal;

  return {
    startDate,
    endDate,
    revenue,
    revenueTotal,
    costOfSales,
    costOfSalesTotal,
    grossProfit,
    operatingExpenses,
    operatingExpensesTotal,
    netProfit,
  };
}
