"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { centsToDollarsString } from "@/lib/money";
import { usePersistedState } from "@/lib/usePersistedState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import PnlChart from "@/components/reports/PnlChart";

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

const TOP_EXPENSES_LIMIT = 8;

export default function Dashboard() {
  const [year, setYear] = usePersistedState("bk:dashboard:year", new Date().getFullYear());
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/profit-loss?year=${year}`)
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [year]);

  const topExpenses = report
    ? [...report.expenses].sort((a, b) => b.total - a.total).slice(0, TOP_EXPENSES_LIMIT)
    : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm">
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
      </div>

      {loading || !report ? (
        <CardSkeleton lines={8} />
      ) : (
        <div className="max-w-4xl space-y-5">
          <section className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Profit &amp; Loss</h2>
              <Link
                href="/reports/profit-loss"
                className="text-sm text-accent-text transition-opacity hover:opacity-70"
              >
                See details &rarr;
              </Link>
            </div>
            <PnlTiles report={report} />
            <div className="mt-5">
              <PnlChart incomeMonthly={report.incomeMonthly} expenseMonthly={report.expenseMonthly} />
            </div>
          </section>

          <section className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Top Expenses</h2>
              <Link
                href="/reports/profit-loss"
                className="text-sm text-accent-text transition-opacity hover:opacity-70"
              >
                See details &rarr;
              </Link>
            </div>
            {topExpenses.length === 0 ? (
              <p className="py-2 text-sm text-text-muted">No expenses in this range.</p>
            ) : (
              <div>
                {topExpenses.map((c) => (
                  <TopExpenseRow key={c.categoryId} row={c} totalExpenses={report.expenseTotal} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PnlTiles({ report }: { report: ProfitLossReport }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Tile label="Total Revenue" amount={report.incomeTotal} />
      <Tile label="Total Expenses" amount={report.expenseTotal} />
      <Tile label="Net Profit" amount={report.netTotal} />
    </div>
  );
}

function Tile({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-lg bg-hover px-4 py-3">
      <div className={`font-display text-xl font-semibold ${amount < 0 ? "text-error" : ""}`}>
        {centsToDollarsString(amount)}
      </div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

function TopExpenseRow({ row, totalExpenses }: { row: CategoryPnlRow; totalExpenses: number }) {
  const pct = totalExpenses > 0 ? (row.total / totalExpenses) * 100 : 0;
  return (
    <div className="flex items-center gap-4 border-b border-border py-2.5 text-sm last:border-b-0">
      <span className="w-32 shrink-0 truncate sm:w-56">{row.categoryName}</span>
      <span className="w-24 shrink-0 text-right font-medium">{centsToDollarsString(row.total)}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-text-muted">{pct.toFixed(0)}%</span>
    </div>
  );
}
