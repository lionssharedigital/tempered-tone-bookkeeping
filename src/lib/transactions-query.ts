import { eq, gte, isNull, like, lte, SQL } from "drizzle-orm";
import { transactions } from "../../db/schema";
import { UNCATEGORIZED_FILTER_VALUE } from "./transaction-filter-constants";

/** Shared by the transactions list and export endpoints so filtering stays in sync. */
export function transactionFilterConditions(sp: URLSearchParams): SQL[] {
  const accountId = sp.get("accountId");
  const categoryId = sp.get("categoryId");
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const q = sp.get("q");

  const conditions: SQL[] = [];
  if (accountId) conditions.push(eq(transactions.accountId, Number(accountId)));
  if (categoryId === UNCATEGORIZED_FILTER_VALUE) {
    conditions.push(isNull(transactions.categoryId));
  } else if (categoryId) {
    conditions.push(eq(transactions.categoryId, Number(categoryId)));
  }
  if (dateFrom) conditions.push(gte(transactions.date, dateFrom));
  if (dateTo) conditions.push(lte(transactions.date, dateTo));
  if (q) conditions.push(like(transactions.payee, `%${q}%`));
  return conditions;
}
