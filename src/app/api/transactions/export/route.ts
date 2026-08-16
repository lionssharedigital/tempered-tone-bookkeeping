import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../../../db/client";
import { transactions, accounts, categories } from "../../../../../db/schema";
import { transactionFilterConditions } from "@/lib/transactions-query";
import {
  buildCsv,
  buildXlsx,
  exportContentType,
  exportFilename,
  toResponseBody,
  type ExportCell,
  type ExportFormat,
} from "@/lib/export";

const HEADERS = ["Date", "Payee", "Account", "Category", "Amount", "Description", "Reference", "Status"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format: ExportFormat = sp.get("format") === "xlsx" ? "xlsx" : "csv";
  const conditions = transactionFilterConditions(sp);

  const rows = db
    .select({
      date: transactions.date,
      payee: transactions.payee,
      accountName: accounts.name,
      categoryName: categories.name,
      amountCents: transactions.amountCents,
      description: transactions.description,
      reference: transactions.reference,
      status: transactions.status,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .all();

  const exportRows: ExportCell[][] = rows.map((r) => [
    r.date,
    r.payee,
    r.accountName,
    r.categoryName ?? "Uncategorized",
    r.amountCents / 100,
    r.description,
    r.reference,
    r.status,
  ]);

  const body =
    format === "xlsx"
      ? await buildXlsx("Transactions", HEADERS, [{ rows: exportRows }])
      : buildCsv(HEADERS, [{ rows: exportRows }]);

  return new NextResponse(toResponseBody(body), {
    headers: {
      "Content-Type": exportContentType(format),
      "Content-Disposition": `attachment; filename="${exportFilename("transactions", format)}"`,
    },
  });
}
