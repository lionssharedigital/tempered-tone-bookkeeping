"use client";

import { useEffect, useState } from "react";
import { centsToDollarsString } from "@/lib/money";
import { usePersistedState } from "@/lib/usePersistedState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import ExportMenu from "@/components/ui/ExportMenu";
import type { ExportFormat } from "@/lib/export";

interface AccountRow {
  accountId: number;
  name: string;
  openingBalanceCents: number;
  activityCents: number;
  endingBalanceCents: number;
}

interface BalanceSheetReport {
  asOfDate: string;
  assets: AccountRow[];
  liabilities: AccountRow[];
  totalAssetsOpening: number;
  totalAssetsActivity: number;
  totalAssetsEnding: number;
  totalLiabilitiesOpening: number;
  totalLiabilitiesActivity: number;
  totalLiabilitiesEnding: number;
  beginningEquity: number;
  netChangeInCash: number;
  totalEquity: number;
  totalLiabilitiesPlusEquity: number;
}

export default function BalanceSheetTable() {
  const [asOfDate, setAsOfDate] = usePersistedState(
    "bk:balance-sheet:asOfDate",
    new Date().toISOString().slice(0, 10),
  );
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/balance-sheet?asOfDate=${asOfDate}`)
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [asOfDate]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">Balance Sheet</h1>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <label className="text-text-muted">As of</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="control-input px-2 py-1.5"
            />
          </div>
          <ExportMenu
            buildHref={(format: ExportFormat) => `/api/reports/balance-sheet/export?asOfDate=${asOfDate}&format=${format}`}
          />
        </div>
      </div>

      {loading || !report ? (
        <TableSkeleton columns={4} rows={8} />
      ) : (
        <div className="table-shell max-w-2xl">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase">
              <tr>
                <th className="px-4 py-2">Account</th>
                <th className="px-4 py-2 text-right">Opening</th>
                <th className="px-4 py-2 text-right">Activity</th>
                <th className="px-4 py-2 text-right">Ending</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-hover">
                <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-text-muted">
                  ASSETS (Cash)
                </td>
              </tr>
              {report.assets.map((a) => (
                <BalanceRow key={a.accountId} row={a} />
              ))}
              <TotalRow
                label="TOTAL ASSETS"
                opening={report.totalAssetsOpening}
                activity={report.totalAssetsActivity}
                ending={report.totalAssetsEnding}
              />

              <tr className="bg-hover">
                <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-text-muted">
                  LIABILITIES
                </td>
              </tr>
              {report.liabilities.map((a) => (
                <BalanceRow key={a.accountId} row={a} />
              ))}
              <TotalRow
                label="TOTAL LIABILITIES"
                opening={report.totalLiabilitiesOpening}
                activity={report.totalLiabilitiesActivity}
                ending={report.totalLiabilitiesEnding}
              />

              <tr className="bg-hover">
                <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-text-muted">
                  EQUITY
                </td>
              </tr>
              <tr>
                <td className="px-4 py-1.5">Beginning Equity</td>
                <td colSpan={2}></td>
                <td className="px-4 py-1.5 text-right">
                  {centsToDollarsString(report.beginningEquity)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-1.5">Net Change in Cash Position</td>
                <td colSpan={2}></td>
                <td className="px-4 py-1.5 text-right">
                  {centsToDollarsString(report.netChangeInCash)}
                </td>
              </tr>
              <tr className="bg-hover font-semibold">
                <td className="px-4 py-1.5">TOTAL EQUITY</td>
                <td colSpan={2}></td>
                <td className="px-4 py-1.5 text-right">{centsToDollarsString(report.totalEquity)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="px-4 py-1.5">TOTAL LIABILITIES + EQUITY</td>
                <td colSpan={2}></td>
                <td className="px-4 py-1.5 text-right">
                  {centsToDollarsString(report.totalLiabilitiesPlusEquity)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BalanceRow({ row }: { row: AccountRow }) {
  return (
    <tr>
      <td className="px-4 py-1.5">{row.name}</td>
      <td className="px-4 py-1.5 text-right text-text-muted">
        {centsToDollarsString(row.openingBalanceCents)}
      </td>
      <td className="px-4 py-1.5 text-right text-text-muted">
        {centsToDollarsString(row.activityCents)}
      </td>
      <td className="px-4 py-1.5 text-right font-medium">
        {centsToDollarsString(row.endingBalanceCents)}
      </td>
    </tr>
  );
}

function TotalRow({
  label,
  opening,
  activity,
  ending,
}: {
  label: string;
  opening: number;
  activity: number;
  ending: number;
}) {
  return (
    <tr className="bg-hover font-semibold">
      <td className="px-4 py-1.5">{label}</td>
      <td className="px-4 py-1.5 text-right">{centsToDollarsString(opening)}</td>
      <td className="px-4 py-1.5 text-right">{centsToDollarsString(activity)}</td>
      <td className="px-4 py-1.5 text-right">{centsToDollarsString(ending)}</td>
    </tr>
  );
}
