import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { categoryMapRules, categories, CATEGORY_TYPES, CATEGORY_CLASSIFICATIONS } from "../../../../../db/schema";
import { getOrCreateCategory } from "@/lib/category-lookup";

const updateSchema = z.object({
  keyword: z.string().trim().min(1).optional(),
  categoryName: z.string().trim().min(1).optional(),
  categoryType: z.enum(CATEGORY_TYPES).optional(),
  categoryClassification: z.enum(CATEGORY_CLASSIFICATIONS).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ruleId = Number(id);
  if (Number.isNaN(ruleId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { keyword, categoryName, categoryType, categoryClassification, priority, isActive } = parsed.data;

  const updates: Partial<typeof categoryMapRules.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (keyword !== undefined) updates.keyword = keyword;
  if (priority !== undefined) updates.priority = priority;
  if (isActive !== undefined) updates.isActive = isActive;
  if (categoryName !== undefined && categoryType !== undefined) {
    updates.categoryId = getOrCreateCategory(categoryName, categoryType, categoryClassification);
  } else if (categoryClassification !== undefined) {
    // Classification-only edit: look up the rule's current category via its
    // existing categoryId rather than re-deriving name+type from the client.
    const rule = db.select().from(categoryMapRules).where(eq(categoryMapRules.id, ruleId)).all()[0];
    if (rule) {
      db.update(categories)
        .set({ classification: categoryClassification })
        .where(eq(categories.id, rule.categoryId))
        .run();
    }
  }

  const [updated] = db
    .update(categoryMapRules)
    .set(updates)
    .where(eq(categoryMapRules.id, ruleId))
    .returning()
    .all();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ruleId = Number(id);
  if (Number.isNaN(ruleId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  db.delete(categoryMapRules).where(eq(categoryMapRules.id, ruleId)).run();
  return NextResponse.json({ ok: true });
}
