import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { db } from "../../../../db/client";
import { categories, CATEGORY_TYPES } from "../../../../db/schema";

export async function GET() {
  const rows = db.select().from(categories).orderBy(asc(categories.type), asc(categories.name)).all();
  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(CATEGORY_TYPES),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, type } = parsed.data;

  const existing = db
    .select()
    .from(categories)
    .all()
    .find((c) => c.name === name && c.type === type);
  if (existing) return NextResponse.json(existing);

  const [created] = db.insert(categories).values({ name, type }).returning().all();
  return NextResponse.json(created, { status: 201 });
}
