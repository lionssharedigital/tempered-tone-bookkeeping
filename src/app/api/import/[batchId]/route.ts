import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { importBatches, accounts } from "../../../../../db/schema";
import { parseCsvText } from "@/lib/csv/parse";
import { suggestColumnMapping } from "@/lib/csv/column-mapper";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const id = Number(batchId);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });

  const batch = db.select().from(importBatches).where(eq(importBatches.id, id)).all()[0];
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const account = db.select().from(accounts).where(eq(accounts.id, batch.accountId)).all()[0];

  const filePath = path.join(UPLOADS_DIR, `${id}.csv`);
  let headers: string[] = [];
  if (fs.existsSync(filePath)) {
    headers = parseCsvText(fs.readFileSync(filePath, "utf-8")).headers;
  }

  const savedMapping = batch.columnMappingJson ? JSON.parse(batch.columnMappingJson) : null;
  const suggestedMapping = savedMapping ?? suggestColumnMapping(headers);

  return NextResponse.json({
    batchId: batch.id,
    accountId: batch.accountId,
    accountName: account?.name ?? "",
    status: batch.status,
    rowCount: batch.rowCount,
    headers,
    suggestedMapping,
  });
}
