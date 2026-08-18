import { NextRequest, NextResponse } from "next/server";
import { getIncomeStatement } from "@/lib/reports/income-statement";

function defaultRange() {
  const year = new Date().getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const defaults = defaultRange();
  const start = sp.get("start") ?? defaults.start;
  const end = sp.get("end") ?? defaults.end;
  return NextResponse.json(getIncomeStatement(start, end));
}
