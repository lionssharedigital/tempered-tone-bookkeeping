import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { categoryMapRules, categories } from "../../../../../db/schema";
import { matchCategoryRule } from "@/lib/category-matcher";

export async function GET(req: NextRequest) {
  const payee = req.nextUrl.searchParams.get("payee") ?? "";
  if (!payee.trim()) return NextResponse.json({ match: null });

  const rules = db.select().from(categoryMapRules).all();
  const match = matchCategoryRule(payee, rules);
  if (!match) return NextResponse.json({ match: null });

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.id, match.categoryId))
    .all()[0];

  return NextResponse.json({
    match: {
      ruleId: match.id,
      categoryId: match.categoryId,
      categoryName: category?.name,
      categoryType: category?.type,
    },
  });
}
