import { NextRequest, NextResponse } from "next/server";
import { getPersonalBudget } from "@/lib/reports/personal-budget";
import {
  buildCsv,
  buildXlsx,
  exportContentType,
  exportFilename,
  toResponseBody,
  type ExportCell,
  type ExportFormat,
  type ExportSection,
} from "@/lib/export";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HEADERS = ["Category", ...MONTH_LABELS, "YTD"];

function toDollars(cents: number): number {
  return Math.round(cents) / 100;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format: ExportFormat = sp.get("format") === "xlsx" ? "xlsx" : "csv";
  const year = Number(sp.get("year") ?? new Date().getFullYear());
  const report = getPersonalBudget(year);

  const categoryRow = (c: { categoryName: string; monthly: number[]; total: number }): ExportCell[] => [
    c.categoryName,
    ...c.monthly.map(toDollars),
    toDollars(c.total),
  ];

  const sections: ExportSection[] = [
    {
      rows: [
        ...report.categories.map(categoryRow),
        ["TOTAL PERSONAL EXPENSES", ...report.monthly.map(toDollars), toDollars(report.total)],
      ],
    },
  ];

  const body =
    format === "xlsx"
      ? await buildXlsx(`Personal Budget ${year}`, HEADERS, sections)
      : buildCsv(HEADERS, sections);

  return new NextResponse(toResponseBody(body), {
    headers: {
      "Content-Type": exportContentType(format),
      "Content-Disposition": `attachment; filename="${exportFilename(`personal-budget-${year}`, format)}"`,
    },
  });
}
