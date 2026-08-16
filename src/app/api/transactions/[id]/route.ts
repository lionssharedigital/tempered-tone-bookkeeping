import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { transactions } from "../../../../../db/schema";
import { computeDedupHash } from "@/lib/dedup";

const updateSchema = z.object({
  accountId: z.number().int().optional(),
  date: z.string().min(1).optional(),
  payee: z.string().trim().min(1).optional(),
  amountCents: z.number().int().optional(),
  description: z.string().trim().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  bankTransactionType: z.string().trim().optional().nullable(),
  categoryId: z.number().int().nullable().optional(),
  categorySource: z.enum(["auto_matched", "manual", "unmatched"]).optional(),
  notes: z.string().trim().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const txnId = Number(id);
  if (Number.isNaN(txnId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = db.select().from(transactions).where(eq(transactions.id, txnId)).all()[0];
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Partial<typeof transactions.$inferInsert> = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  // If any dedup-relevant field changed, recompute the hash so the unique
  // constraint still reflects reality and future imports dedup correctly.
  const merged = { ...existing, ...parsed.data };
  updates.dedupHash = computeDedupHash({
    accountId: merged.accountId,
    date: merged.date,
    payee: merged.payee,
    amountCents: merged.amountCents,
    reference: merged.reference,
  });

  try {
    const [updated] = db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, txnId))
      .returning()
      .all();
    return NextResponse.json(updated);
  } catch (err) {
    if (String(err).includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "Another transaction with the same account, date, payee, amount, and reference already exists." },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const txnId = Number(id);
  if (Number.isNaN(txnId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  db.delete(transactions).where(eq(transactions.id, txnId)).run();
  return NextResponse.json({ ok: true });
}
