import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { accounts, ACCOUNT_TYPES } from "../../../../../db/schema";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  institution: z.string().trim().min(1).optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
  openingBalanceCents: z.number().int().optional(),
  openingBalanceDate: z.string().min(1).optional(),
  currency: z.string().optional(),
  isArchived: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accountId = Number(id);
  if (Number.isNaN(accountId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = db
    .update(accounts)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, accountId))
    .returning()
    .all();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accountId = Number(id);
  if (Number.isNaN(accountId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Soft-delete: archive rather than hard-delete, since transactions reference accounts.
  const [updated] = db
    .update(accounts)
    .set({ isArchived: true, updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, accountId))
    .returning()
    .all();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
