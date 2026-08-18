import { NextRequest, NextResponse } from "next/server";
import { getIncomeStatement } from "@/lib/reports/income-statement";
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

const HEADERS = ["Category", "Amount"];

function toDollars(cents: number): number {
  return Math.round(cents) / 100;
}

function defaultRange() {
  const year = new Date().getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format: ExportFormat = sp.get("format") === "xlsx" ? "xlsx" : "csv";
  const defaults = defaultRange();
  const start = sp.get("start") ?? defaults.start;
  const end = sp.get("end") ?? defaults.end;
  const report = getIncomeStatement(start, end);

  const lineRow = (l: { categoryName: string; total: number }): ExportCell[] => [
    l.categoryName,
    toDollars(l.total),
  ];

  const sections: ExportSection[] = [
    {
      heading: "REVENUE",
      rows: [...report.revenue.map(lineRow), ["Total Revenue", toDollars(report.revenueTotal)]],
    },
    {
      heading: "COST OF SALES",
      rows: [
        ...report.costOfSales.map(lineRow),
        ["Total Cost of Sales", toDollars(report.costOfSalesTotal)],
      ],
    },
    {
      rows: [["GROSS PROFIT", toDollars(report.grossProfit)]],
    },
    {
      heading: "OPERATING EXPENSES",
      rows: [
        ...report.operatingExpenses.map(lineRow),
        ["Total Operating Expenses", toDollars(report.operatingExpensesTotal)],
      ],
    },
    {
      rows: [["NET PROFIT", toDollars(report.netProfit)]],
    },
  ];

  const body =
    format === "xlsx"
      ? await buildXlsx("Income Statement", HEADERS, sections)
      : buildCsv(HEADERS, sections);

  return new NextResponse(toResponseBody(body), {
    headers: {
      "Content-Type": exportContentType(format),
      "Content-Disposition": `attachment; filename="${exportFilename(`income-statement-${start}-to-${end}`, format)}"`,
    },
  });
}
