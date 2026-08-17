import { NextRequest, NextResponse } from "next/server";
import { getPersonalBudget } from "@/lib/reports/personal-budget";

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  return NextResponse.json(getPersonalBudget(year));
}
