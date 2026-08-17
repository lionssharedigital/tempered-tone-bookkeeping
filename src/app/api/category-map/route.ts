import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { categoryMapRules, categories, CATEGORY_TYPES, CATEGORY_CLASSIFICATIONS } from "../../../../db/schema";
import { getOrCreateCategory } from "@/lib/category-lookup";

export async function GET() {
  const rows = db
    .select({
      id: categoryMapRules.id,
      keyword: categoryMapRules.keyword,
      priority: categoryMapRules.priority,
      isActive: categoryMapRules.isActive,
      categoryId: categoryMapRules.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryClassification: categories.classification,
    })
    .from(categoryMapRules)
    .innerJoin(categories, eq(categoryMapRules.categoryId, categories.id))
    .orderBy(desc(categoryMapRules.priority))
    .all();
  return NextResponse.json(rows);
}

const createSchema = z.object({
  keyword: z.string().trim().min(1),
  categoryName: z.string().trim().min(1),
  categoryType: z.enum(CATEGORY_TYPES),
  categoryClassification: z.enum(CATEGORY_CLASSIFICATIONS).optional(),
  priority: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { keyword, categoryName, categoryType, categoryClassification, priority } = parsed.data;
  const categoryId = getOrCreateCategory(categoryName, categoryType, categoryClassification);

  const [created] = db
    .insert(categoryMapRules)
    .values({ keyword, categoryId, priority: priority ?? 0 })
    .returning()
    .all();
  return NextResponse.json(created, { status: 201 });
}
