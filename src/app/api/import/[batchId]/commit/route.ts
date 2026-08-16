import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../../../../../db/client";
import { importBatches, transactions } from "../../../../../../db/schema";
import { computeDedupHash } from "@/lib/dedup";

const rowSchema = z.object({
  date: z.string().nullable(),
  payee: z.string(),
  amountCents: z.number().int().nullable(),
  description: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  bankTransactionType: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  categoryId: z.number().int().nullable(),
  matchedRuleId: z.number().int().nullable(),
  accepted: z.boolean(),
});

const commitSchema = z.object({ rows: z.array(rowSchema) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const id = Number(batchId);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });

  const batch = db.select().from(importBatches).where(eq(importBatches.id, id)).all()[0];
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status === "committed") {
    return NextResponse.json({ error: "This batch was already committed." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = commitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let imported = 0;
  let skippedDuplicate = 0;

  for (const row of parsed.data.rows) {
    if (!row.accepted) continue;
    if (!row.date || row.amountCents === null || !row.payee.trim()) continue;

    const dedupHash = computeDedupHash({
      accountId: batch.accountId,
      date: row.date,
      payee: row.payee,
      amountCents: row.amountCents,
      reference: row.reference,
    });

    try {
      db.insert(transactions)
        .values({
          accountId: batch.accountId,
          date: row.date,
          payee: row.payee.trim(),
          amountCents: row.amountCents,
          description: row.description || null,
          reference: row.reference || null,
          bankTransactionType: row.bankTransactionType || null,
          categoryId: row.categoryId,
          matchedRuleId: row.matchedRuleId,
          categorySource: row.matchedRuleId ? "auto_matched" : row.categoryId ? "manual" : "unmatched",
          importBatchId: id,
          dedupHash,
        })
        .run();
      imported++;
    } catch (err) {
      if (String(err).includes("UNIQUE constraint failed")) {
        skippedDuplicate++;
      } else {
        throw err;
      }
    }
  }

  db.update(importBatches)
    .set({
      status: "committed",
      importedCount: imported,
      skippedDuplicateCount: skippedDuplicate,
    })
    .where(eq(importBatches.id, id))
    .run();

  return NextResponse.json({ imported, skippedDuplicate });
}
