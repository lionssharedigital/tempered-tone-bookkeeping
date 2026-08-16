"use client";

import { useEffect, useState } from "react";
import { centsToDollarsString } from "@/lib/money";
import { usePersistedState } from "@/lib/usePersistedState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import ExportMenu from "@/components/ui/ExportMenu";
import type { ExportFormat } from "@/lib/export";
import PnlChart from "./PnlChart";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface CategoryPnlRow {
  categoryId: number;
  categoryName: string;
  monthly: number[];
  total: number;
}

interface ProfitLossReport {
  year: number;
  income: CategoryPnlRow[];
  expenses: CategoryPnlRow[];
  incomeMonthly: number[];
  incomeTotal: number;
  expenseMonthly: number[];
  expenseTotal: number;
  netMonthly: number[];
  netTotal: number;
}

export default function PnlTable() {
  const [year, setYear] = usePersistedState("bk:pnl:year", new Date().getFullYear());
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/profit-loss?year=${year}`)
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">Profit &amp; Loss</h1>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="btn-secondary h-8 w-8 rounded-full text-center"
            >
              &larr;
            </button>
            <span className="w-12 text-center font-medium">{year}</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="btn-secondary h-8 w-8 rounded-full text-center"
            >
              &rarr;
            </button>
          </div>
          <ExportMenu
            buildHref={(format: ExportFormat) => `/api/reports/profit-loss/export?year=${year}&format=${format}`}
          />
        </div>
      </div>

      {loading || !report ? (
        <TableSkeleton columns={13} rows={8} />
      ) : (
        <>
          <PnlChart incomeMonthly={report.incomeMonthly} expenseMonthly={report.expenseMonthly} />
          <div className="table-shell overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase">
              <tr>
                <th className="sticky left-0 bg-bg px-3 py-2">Category</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="px-3 py-2 text-right">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">YTD</th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader label="INCOME" />
              {report.income.map((c) => (
                <CategoryRow key={c.categoryId} row={c} />
              ))}
              <TotalRow label="TOTAL INCOME" monthly={report.incomeMonthly} total={report.incomeTotal} />

              <SectionHeader label="EXPENSES" />
              {report.expenses.map((c) => (
                <CategoryRow key={c.categoryId} row={c} />
              ))}
              <TotalRow
                label="TOTAL EXPENSES"
                monthly={report.expenseMonthly}
                total={report.expenseTotal}
              />

              <TotalRow label="NET PROFIT / LOSS" monthly={report.netMonthly} total={report.netTotal} bold />
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-hover">
      <td colSpan={14} className="px-3 py-1.5 text-xs font-semibold text-text-muted">
        {label}
      </td>
    </tr>
  );
}

function CategoryRow({ row }: { row: CategoryPnlRow }) {
  return (
    <tr>
      <td className="sticky left-0 bg-surface px-3 py-1.5">{row.categoryName}</td>
      {row.monthly.map((v, i) => (
        <td key={i} className="px-3 py-1.5 text-right text-text-muted">
          {v === 0 ? "—" : centsToDollarsString(v)}
        </td>
      ))}
      <td className="px-3 py-1.5 text-right font-medium">{centsToDollarsString(row.total)}</td>
    </tr>
  );
}

function TotalRow({
  label,
  monthly,
  total,
  bold,
}: {
  label: string;
  monthly: number[];
  total: number;
  bold?: boolean;
}) {
  return (
    <tr className={bold ? "bg-hover font-semibold" : "font-medium"}>
      <td className="sticky left-0 bg-inherit px-3 py-1.5">{label}</td>
      {monthly.map((v, i) => (
        <td key={i} className="px-3 py-1.5 text-right">
          {centsToDollarsString(v)}
        </td>
      ))}
      <td className="px-3 py-1.5 text-right">{centsToDollarsString(total)}</td>
    </tr>
  );
}
