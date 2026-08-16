import { NextRequest, NextResponse } from "next/server";
import { getBalanceSheet } from "@/lib/reports/balance-sheet";

export async function GET(req: NextRequest) {
  const asOfDate = req.nextUrl.searchParams.get("asOfDate") ?? new Date().toISOString().slice(0, 10);
  return NextResponse.json(getBalanceSheet(asOfDate));
}
