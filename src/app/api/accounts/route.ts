import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { db } from "../../../../db/client";
import { accounts, ACCOUNT_TYPES } from "../../../../db/schema";

export async function GET() {
  const rows = db.select().from(accounts).orderBy(asc(accounts.sortOrder), asc(accounts.name)).all();
  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  institution: z.string().trim().min(1),
  accountType: z.enum(ACCOUNT_TYPES).default("bank"),
  openingBalanceCents: z.number().int().default(0),
  openingBalanceDate: z.string().min(1),
  currency: z.string().default("USD"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const maxSortOrder = db.select().from(accounts).all().reduce((m, a) => Math.max(m, a.sortOrder), -1);
  const [created] = db
    .insert(accounts)
    .values({ ...parsed.data, sortOrder: maxSortOrder + 1 })
    .returning()
    .all();
  return NextResponse.json(created, { status: 201 });
}
