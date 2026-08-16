import { NextRequest, NextResponse } from "next/server";
import { getProfitLoss } from "@/lib/reports/profit-loss";
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
  const report = getProfitLoss(year);

  const categoryRow = (c: { categoryName: string; monthly: number[]; total: number }): ExportCell[] => [
    c.categoryName,
    ...c.monthly.map(toDollars),
    toDollars(c.total),
  ];
  const totalRow = (label: string, monthly: number[], total: number): ExportCell[] => [
    label,
    ...monthly.map(toDollars),
    toDollars(total),
  ];

  const sections: ExportSection[] = [
    {
      heading: "INCOME",
      rows: [
        ...report.income.map(categoryRow),
        totalRow("TOTAL INCOME", report.incomeMonthly, report.incomeTotal),
      ],
    },
    {
      heading: "EXPENSES",
      rows: [
        ...report.expenses.map(categoryRow),
        totalRow("TOTAL EXPENSES", report.expenseMonthly, report.expenseTotal),
      ],
    },
    {
      rows: [totalRow("NET PROFIT / LOSS", report.netMonthly, report.netTotal)],
    },
  ];

  const body =
    format === "xlsx"
      ? await buildXlsx(`P&L ${year}`, HEADERS, sections)
      : buildCsv(HEADERS, sections);

  return new NextResponse(toResponseBody(body), {
    headers: {
      "Content-Type": exportContentType(format),
      "Content-Disposition": `attachment; filename="${exportFilename(`profit-and-loss-${year}`, format)}"`,
    },
  });
}
