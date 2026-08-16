import { NextRequest, NextResponse } from "next/server";
import { getProfitLoss } from "@/lib/reports/profit-loss";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  return NextResponse.json(getProfitLoss(year));
}
