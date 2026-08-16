import { NextRequest, NextResponse } from "next/server";
import { getBalanceSheet } from "@/lib/reports/balance-sheet";
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

const HEADERS = ["Account", "Opening", "Activity", "Ending"];

function toDollars(cents: number): number {
  return Math.round(cents) / 100;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format: ExportFormat = sp.get("format") === "xlsx" ? "xlsx" : "csv";
  const asOfDate = sp.get("asOfDate") ?? new Date().toISOString().slice(0, 10);
  const report = getBalanceSheet(asOfDate);

  const accountRow = (a: { name: string; openingBalanceCents: number; activityCents: number; endingBalanceCents: number }): ExportCell[] => [
    a.name,
    toDollars(a.openingBalanceCents),
    toDollars(a.activityCents),
    toDollars(a.endingBalanceCents),
  ];

  const sections: ExportSection[] = [
    {
      heading: "ASSETS (Cash)",
      rows: [
        ...report.assets.map(accountRow),
        [
          "TOTAL ASSETS",
          toDollars(report.totalAssetsOpening),
          toDollars(report.totalAssetsActivity),
          toDollars(report.totalAssetsEnding),
        ],
      ],
    },
    {
      heading: "LIABILITIES",
      rows: [
        ...report.liabilities.map(accountRow),
        [
          "TOTAL LIABILITIES",
          toDollars(report.totalLiabilitiesOpening),
          toDollars(report.totalLiabilitiesActivity),
          toDollars(report.totalLiabilitiesEnding),
        ],
      ],
    },
    {
      heading: "EQUITY",
      rows: [
        ["Beginning Equity", null, null, toDollars(report.beginningEquity)],
        ["Net Change in Cash Position", null, null, toDollars(report.netChangeInCash)],
        ["TOTAL EQUITY", null, null, toDollars(report.totalEquity)],
        ["TOTAL LIABILITIES + EQUITY", null, null, toDollars(report.totalLiabilitiesPlusEquity)],
      ],
    },
  ];

  const body =
    format === "xlsx"
      ? await buildXlsx(`Balance Sheet ${asOfDate}`, HEADERS, sections)
      : buildCsv(HEADERS, sections);

  return new NextResponse(toResponseBody(body), {
    headers: {
      "Content-Type": exportContentType(format),
      "Content-Disposition": `attachment; filename="${exportFilename(`balance-sheet-${asOfDate}`, format)}"`,
    },
  });
}
