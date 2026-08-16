import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../../../../../db/client";
import { importBatches } from "../../../../../../db/schema";
import { parseCsvText } from "@/lib/csv/parse";
import { buildPreviewRows, RawImportRow } from "@/lib/import/build-preview-rows";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

const mappingSchema = z.object({
  date: z.string().min(1),
  payee: z.string().min(1),
  amount: z.string().min(1),
  description: z.string().optional(),
  reference: z.string().optional(),
  bankTransactionType: z.string().optional(),
  status: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const id = Number(batchId);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });

  const batch = db.select().from(importBatches).where(eq(importBatches.id, id)).all()[0];
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = mappingSchema.safeParse(body?.mapping);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const mapping = parsed.data;

  const filePath = path.join(UPLOADS_DIR, `${id}.csv`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Uploaded file is no longer available; re-upload." }, { status: 410 });
  }
  const text = fs.readFileSync(filePath, "utf-8");
  const { headers, rows } = parseCsvText(text);

  const colIndex = (field?: string) => (field ? headers.indexOf(field) : -1);
  const idx = {
    date: colIndex(mapping.date),
    payee: colIndex(mapping.payee),
    amount: colIndex(mapping.amount),
    description: colIndex(mapping.description),
    reference: colIndex(mapping.reference),
    bankTransactionType: colIndex(mapping.bankTransactionType),
    status: colIndex(mapping.status),
  };

  const rawRows: RawImportRow[] = rows.map((row) => ({
    date: idx.date >= 0 ? row[idx.date] ?? "" : "",
    payee: idx.payee >= 0 ? row[idx.payee] ?? "" : "",
    amount: idx.amount >= 0 ? row[idx.amount] ?? "" : "",
    description: idx.description >= 0 ? row[idx.description] : undefined,
    reference: idx.reference >= 0 ? row[idx.reference] : undefined,
    bankTransactionType: idx.bankTransactionType >= 0 ? row[idx.bankTransactionType] : undefined,
    status: idx.status >= 0 ? row[idx.status] : undefined,
  }));

  const previewRows = buildPreviewRows(batch.accountId, rawRows);

  db.update(importBatches)
    .set({ columnMappingJson: JSON.stringify(mapping) })
    .where(eq(importBatches.id, id))
    .run();

  return NextResponse.json({ batchId: id, accountId: batch.accountId, rows: previewRows });
}
