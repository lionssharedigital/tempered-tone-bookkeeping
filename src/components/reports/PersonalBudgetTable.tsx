"use client";

import { useEffect, useState } from "react";
import { centsToDollarsString } from "@/lib/money";
import { usePersistedState } from "@/lib/usePersistedState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ExportMenu from "@/components/ui/ExportMenu";
import type { ExportFormat } from "@/lib/export";
import PersonalBudgetChart from "./PersonalBudgetChart";

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

interface PersonalBudgetCategoryRow {
  categoryId: number;
  categoryName: string;
  monthly: number[];
  total: number;
}

interface PersonalBudgetReport {
  year: number;
  categories: PersonalBudgetCategoryRow[];
  monthly: number[];
  total: number;
}

export default function PersonalBudgetTable() {
  const [year, setYear] = usePersistedState("bk:personal-budget:year", new Date().getFullYear());
  const [report, setReport] = useState<PersonalBudgetReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/personal-budget?year=${year}`)
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">Personal Budget</h1>
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
            buildHref={(format: ExportFormat) => `/api/reports/personal-budget/export?year=${year}&format=${format}`}
          />
        </div>
      </div>

      {loading || !report ? (
        <TableSkeleton columns={13} rows={6} />
      ) : report.categories.length === 0 ? (
        <EmptyState
          title="No personal expenses yet"
          message='Mark a category "Personal" on the Category Map page, then categorize transactions against it, and it will show up here.'
        />
      ) : (
        <>
          <PersonalBudgetChart monthly={report.monthly} />
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
                {report.categories.map((c) => (
                  <tr key={c.categoryId}>
                    <td className="sticky left-0 bg-surface px-3 py-1.5">{c.categoryName}</td>
                    {c.monthly.map((v, i) => (
                      <td key={i} className="px-3 py-1.5 text-right text-text-muted">
                        {v === 0 ? "—" : centsToDollarsString(v)}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-medium">{centsToDollarsString(c.total)}</td>
                  </tr>
                ))}
                <tr className="bg-hover font-semibold">
                  <td className="sticky left-0 bg-inherit px-3 py-1.5">TOTAL PERSONAL EXPENSES</td>
                  {report.monthly.map((v, i) => (
                    <td key={i} className="px-3 py-1.5 text-right">
                      {centsToDollarsString(v)}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right">{centsToDollarsString(report.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
