import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { importBatches } from "../../../../../db/schema";
import { parseCsvText } from "@/lib/csv/parse";
import { suggestColumnMapping } from "@/lib/csv/column-mapper";
import { extractPositionedText } from "@/lib/pdf/extract-text";
import { reconstructRows } from "@/lib/pdf/row-reconstruct";
import { extractTransactionTable } from "@/lib/pdf/generic-extractor";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });

  const file = form.get("file");
  const accountIdRaw = form.get("accountId");
  if (!(file instanceof File) || typeof accountIdRaw !== "string") {
    return NextResponse.json({ error: "file and accountId are required." }, { status: 400 });
  }
  const accountId = Number(accountIdRaw);
  if (Number.isNaN(accountId)) {
    return NextResponse.json({ error: "Invalid accountId." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const duplicateBatch = db
    .select()
    .from(importBatches)
    .where(
      and(
        eq(importBatches.accountId, accountId),
        eq(importBatches.fileHash, fileHash),
        eq(importBatches.status, "committed"),
      ),
    )
    .all()[0];

  let csvText: string;
  let headers: string[];
  let rowCount: number;

  if (isPdf) {
    try {
      const items = await extractPositionedText(buffer);
      const rows = reconstructRows(items);
      const table = extractTransactionTable(rows);
      if (table.rows.length === 0) {
        return NextResponse.json(
          { error: "Could not find a transaction table in this PDF. Try a CSV export instead." },
          { status: 400 },
        );
      }
      headers = table.headers;
      rowCount = table.rows.length;
      csvText = Papa.unparse({ fields: table.headers, data: table.rows });
    } catch {
      return NextResponse.json({ error: "Could not parse this PDF." }, { status: 400 });
    }
  } else {
    csvText = buffer.toString("utf-8");
    try {
      const parsed = parseCsvText(csvText);
      headers = parsed.headers;
      rowCount = parsed.rows.length;
    } catch {
      return NextResponse.json({ error: "Could not parse this file as CSV." }, { status: 400 });
    }
  }

  const lastCommittedForAccount = db
    .select()
    .from(importBatches)
    .where(and(eq(importBatches.accountId, accountId), eq(importBatches.status, "committed")))
    .orderBy(desc(importBatches.createdAt))
    .all()[0];

  const suggestedMapping = lastCommittedForAccount?.columnMappingJson
    ? JSON.parse(lastCommittedForAccount.columnMappingJson)
    : suggestColumnMapping(headers);

  const [batch] = db
    .insert(importBatches)
    .values({
      accountId,
      sourceType: isPdf ? "pdf" : "csv",
      originalFilename: file.name,
      fileHash,
      rowCount,
      status: "pending_review",
    })
    .returning()
    .all();

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  // The mapping/preview/commit pipeline always reads from the derived CSV,
  // whether the source was a CSV upload or PDF extraction, so PDF import
  // reuses the exact same review flow.
  fs.writeFileSync(path.join(UPLOADS_DIR, `${batch.id}.csv`), csvText, "utf-8");
  if (isPdf) {
    fs.writeFileSync(path.join(UPLOADS_DIR, `${batch.id}.pdf`), buffer);
  }

  return NextResponse.json({
    batchId: batch.id,
    headers,
    sampleRows: [],
    rowCount,
    suggestedMapping,
    duplicateFileWarning: duplicateBatch
      ? `This exact file was already imported on ${duplicateBatch.createdAt}.`
      : null,
  });
}
