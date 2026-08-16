import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../../db/client";
import { transactions, accounts, categories } from "../../../../db/schema";
import { computeDedupHash } from "@/lib/dedup";
import { transactionFilterConditions } from "@/lib/transactions-query";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  // No real pagination UI: for a single-business ledger, "show everything
  // by default and let filters/sort narrow it down" is simpler than paging.
  // The cap is just a sanity backstop, not an expected ceiling.
  const limit = Math.min(Number(sp.get("limit") ?? 5000), 10000);
  const offset = Number(sp.get("offset") ?? 0);

  const conditions = transactionFilterConditions(sp);

  const rows = db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      accountName: accounts.name,
      date: transactions.date,
      payee: transactions.payee,
      bankTransactionType: transactions.bankTransactionType,
      description: transactions.description,
      reference: transactions.reference,
      status: transactions.status,
      amountCents: transactions.amountCents,
      currency: transactions.currency,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      categorySource: transactions.categorySource,
      notes: transactions.notes,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json(rows);
}

const createSchema = z.object({
  accountId: z.number().int(),
  date: z.string().min(1),
  payee: z.string().trim().min(1),
  amountCents: z.number().int(),
  description: z.string().trim().optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  bankTransactionType: z.string().trim().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
  matchedRuleId: z.number().int().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const categorySource = data.matchedRuleId
    ? "auto_matched"
    : data.categoryId
      ? "manual"
      : "unmatched";

  const dedupHash = computeDedupHash({
    accountId: data.accountId,
    date: data.date,
    payee: data.payee,
    amountCents: data.amountCents,
    reference: data.reference,
  });

  try {
    const [created] = db
      .insert(transactions)
      .values({
        accountId: data.accountId,
        date: data.date,
        payee: data.payee,
        amountCents: data.amountCents,
        description: data.description ?? null,
        reference: data.reference ?? null,
        bankTransactionType: data.bankTransactionType ?? null,
        categoryId: data.categoryId ?? null,
        matchedRuleId: data.matchedRuleId ?? null,
        categorySource,
        notes: data.notes ?? null,
        dedupHash,
      })
      .returning()
      .all();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (String(err).includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "A transaction with the same account, date, payee, amount, and reference already exists." },
        { status: 409 },
      );
    }
    throw err;
  }
}
