import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../db/client";
import { transactions, categories } from "../../../db/schema";

export interface PersonalBudgetCategoryRow {
  categoryId: number;
  categoryName: string;
  monthly: number[]; // 12 entries, cents, positive magnitude
  total: number;
}

export interface PersonalBudgetReport {
  year: number;
  categories: PersonalBudgetCategoryRow[];
  monthly: number[];
  total: number;
}

/**
 * Personal spending, computed on read the same way as the P&L: only
 * transactions whose category is classified "personal" and typed "Expense"
 * count. Business categories (or personal Income/Transfer categories, if
 * anyone ever adds one) are excluded, matching what a household budget
 * cares about.
 */
export function getPersonalBudget(year: number): PersonalBudgetReport {
  const rows = db
    .select({
      amountCents: transactions.amountCents,
      date: transactions.date,
      categoryId: categories.id,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        gte(transactions.date, `${year}-01-01`),
        lte(transactions.date, `${year}-12-31`),
        eq(categories.type, "Expense"),
        eq(categories.classification, "personal"),
      ),
    )
    .all();

  const byCategory = new Map<number, PersonalBudgetCategoryRow>();
  for (const row of rows) {
    if (!byCategory.has(row.categoryId)) {
      byCategory.set(row.categoryId, {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        monthly: new Array(12).fill(0),
        total: 0,
      });
    }
    const entry = byCategory.get(row.categoryId)!;
    const month = Number(row.date.slice(5, 7)) - 1;
    // Expense amounts are stored as negative cents (outflows); flip sign so
    // the UI can display a positive spend magnitude.
    entry.monthly[month] += -row.amountCents;
    entry.total += -row.amountCents;
  }

  const categoryRows = Array.from(byCategory.values()).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName),
  );

  const monthly = Array.from({ length: 12 }, (_, m) =>
    categoryRows.reduce((s, r) => s + r.monthly[m], 0),
  );
  const total = monthly.reduce((s, v) => s + v, 0);

  return { year, categories: categoryRows, monthly, total };
}
