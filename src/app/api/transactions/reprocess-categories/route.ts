import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { transactions, categoryMapRules } from "../../../../../db/schema";
import { matchCategoryRule } from "@/lib/category-matcher";

/**
 * Re-applies the current Category Map rules to existing transactions.
 * Only touches transactions whose category was auto-matched or never set
 * (categorySource 'auto_matched' | 'unmatched') -- transactions the user
 * manually categorized are never overwritten. A transaction is only
 * updated when a rule actually matches; transactions that still don't
 * match anything are left as-is rather than cleared.
 */
export async function POST() {
  const rules = db.select().from(categoryMapRules).all();

  const candidates = db
    .select()
    .from(transactions)
    .where(inArray(transactions.categorySource, ["auto_matched", "unmatched"]))
    .all();

  let updated = 0;
  for (const txn of candidates) {
    const match = matchCategoryRule(txn.payee, rules);
    if (!match) continue;
    if (match.categoryId === txn.categoryId && match.id === txn.matchedRuleId) continue;

    db.update(transactions)
      .set({
        categoryId: match.categoryId,
        matchedRuleId: match.id,
        categorySource: "auto_matched",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(transactions.id, txn.id))
      .run();
    updated++;
  }

  return NextResponse.json({
    scanned: candidates.length,
    updated,
    unchanged: candidates.length - updated,
  });
}
