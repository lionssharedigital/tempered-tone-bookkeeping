import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../db/client";
import { transactions, categories } from "../../../db/schema";

export interface CategoryPnlRow {
  categoryId: number;
  categoryName: string;
  categoryType: "Income" | "Expense";
  monthly: number[]; // 12 entries, cents
  total: number;
}

export interface ProfitLossReport {
  year: number;
  income: CategoryPnlRow[];
  expenses: CategoryPnlRow[];
  incomeMonthly: number[];
  incomeTotal: number;
  expenseMonthly: number[];
  expenseTotal: number;
  netMonthly: number[];
  netTotal: number;
}

/**
 * P&L is computed on read from transactions, mirroring the original sheet's
 * pivot. Transfer and Credit Card typed categories are excluded, same as the
 * sheet excludes internal transfers to avoid double-counting.
 */
export function getProfitLoss(year: number): ProfitLossReport {
  const rows = db
    .select({
      amountCents: transactions.amountCents,
      date: transactions.date,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryType: categories.type,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        gte(transactions.date, `${year}-01-01`),
        lte(transactions.date, `${year}-12-31`),
      ),
    )
    .all()
    .filter((r) => r.categoryType === "Income" || r.categoryType === "Expense");

  const byCategory = new Map<number, CategoryPnlRow>();
  for (const row of rows) {
    if (!byCategory.has(row.categoryId)) {
      byCategory.set(row.categoryId, {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryType: row.categoryType as "Income" | "Expense",
        monthly: new Array(12).fill(0),
        total: 0,
      });
    }
    const entry = byCategory.get(row.categoryId)!;
    const month = Number(row.date.slice(5, 7)) - 1;
    entry.monthly[month] += row.amountCents;
    entry.total += row.amountCents;
  }

  const all = Array.from(byCategory.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  const income = all.filter((c) => c.categoryType === "Income");
  // Expense amounts are stored as negative cents (outflows); flip sign on
  // each row so the UI can display a positive magnitude, matching how the
  // original sheet displays expense categories and TOTAL EXPENSES.
  const expenses = all
    .filter((c) => c.categoryType === "Expense")
    .map((c) => ({ ...c, monthly: c.monthly.map((v) => -v), total: -c.total }));

  const sumMonthly = (rows: CategoryPnlRow[]) =>
    Array.from({ length: 12 }, (_, m) => rows.reduce((s, r) => s + r.monthly[m], 0));

  const incomeMonthly = sumMonthly(income);
  const expenseMonthly = sumMonthly(expenses);
  const incomeTotal = incomeMonthly.reduce((s, v) => s + v, 0);
  const expenseTotal = expenseMonthly.reduce((s, v) => s + v, 0);
  const netMonthly = incomeMonthly.map((inc, i) => inc - expenseMonthly[i]);
  const netTotal = incomeTotal - expenseTotal;

  return {
    year,
    income,
    expenses,
    incomeMonthly,
    incomeTotal,
    expenseMonthly,
    expenseTotal,
    netMonthly,
    netTotal,
  };
}
