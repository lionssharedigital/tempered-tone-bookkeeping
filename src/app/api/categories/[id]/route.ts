import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db, sqlite } from "../../../../../db/client";
import {
  categories,
  categoryMapRules,
  transactions,
  CATEGORY_TYPES,
  CATEGORY_CLASSIFICATIONS,
} from "../../../../../db/schema";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: z.enum(CATEGORY_TYPES).optional(),
  classification: z.enum(CATEGORY_CLASSIFICATIONS).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = Number(id);
  if (Number.isNaN(categoryId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = db.select().from(categories).where(eq(categories.id, categoryId)).all()[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const name = parsed.data.name ?? existing.name;
  const type = parsed.data.type ?? existing.type;
  const classification = parsed.data.classification ?? existing.classification;

  const collision = db
    .select()
    .from(categories)
    .all()
    .find((c) => c.id !== categoryId && c.name === name && c.type === type);
  if (collision) {
    return NextResponse.json(
      { error: `A "${type}" category named "${name}" already exists.` },
      { status: 409 },
    );
  }

  const [updated] = db
    .update(categories)
    .set({ name, type, classification })
    .where(eq(categories.id, categoryId))
    .returning()
    .all();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categoryId = Number(id);
  if (Number.isNaN(categoryId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const existing = db.select().from(categories).where(eq(categories.id, categoryId)).all()[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Deleting a category unassigns it everywhere rather than blocking on
  // foreign-key references: any category-map rules pointing to it are
  // removed, and any transactions using it fall back to Uncategorized
  // (categoryId null) -- the app already treats that as a normal, filterable
  // state, so nothing is destroyed, just uncategorized.
  const result = sqlite.transaction(() => {
    const ruleIds = db
      .select({ id: categoryMapRules.id })
      .from(categoryMapRules)
      .where(eq(categoryMapRules.categoryId, categoryId))
      .all()
      .map((r) => r.id);

    if (ruleIds.length > 0) {
      db.update(transactions)
        .set({ matchedRuleId: null })
        .where(inArray(transactions.matchedRuleId, ruleIds))
        .run();
      db.delete(categoryMapRules).where(inArray(categoryMapRules.id, ruleIds)).run();
    }

    const unassigned = db
      .update(transactions)
      .set({ categoryId: null, categorySource: "unmatched" })
      .where(eq(transactions.categoryId, categoryId))
      .returning({ id: transactions.id })
      .all().length;

    db.delete(categories).where(eq(categories.id, categoryId)).run();

    return { deletedRuleCount: ruleIds.length, unassignedTransactionCount: unassigned };
  })();

  return NextResponse.json({ ok: true, ...result });
}
