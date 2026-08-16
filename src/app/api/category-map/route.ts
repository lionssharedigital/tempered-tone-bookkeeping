import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { categoryMapRules, categories, CATEGORY_TYPES } from "../../../../db/schema";

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
  priority: z.number().int().optional(),
});

function getOrCreateCategory(name: string, type: (typeof CATEGORY_TYPES)[number]): number {
  const existing = db
    .select()
    .from(categories)
    .all()
    .find((c) => c.name === name && c.type === type);
  if (existing) return existing.id;
  const [created] = db.insert(categories).values({ name, type }).returning().all();
  return created.id;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { keyword, categoryName, categoryType, priority } = parsed.data;
  const categoryId = getOrCreateCategory(categoryName, categoryType);

  const [created] = db
    .insert(categoryMapRules)
    .values({ keyword, categoryId, priority: priority ?? 0 })
    .returning()
    .all();
  return NextResponse.json(created, { status: 201 });
}
