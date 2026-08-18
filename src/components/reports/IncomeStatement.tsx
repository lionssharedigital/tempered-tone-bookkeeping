"use client";

import { useEffect, useState } from "react";
import { centsToDollarsString } from "@/lib/money";
import { usePersistedState } from "@/lib/usePersistedState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import ExportMenu from "@/components/ui/ExportMenu";
import type { ExportFormat } from "@/lib/export";

interface IncomeStatementLine {
  categoryId: number;
  categoryName: string;
  total: number;
}

interface IncomeStatementReport {
  startDate: string;
  endDate: string;
  revenue: IncomeStatementLine[];
  revenueTotal: number;
  costOfSales: IncomeStatementLine[];
  costOfSalesTotal: number;
  grossProfit: number;
  operatingExpenses: IncomeStatementLine[];
  operatingExpensesTotal: number;
  netProfit: number;
}

function defaultRange() {
  const year = new Date().getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export default function IncomeStatement() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = usePersistedState("bk:income-statement:start", defaults.start);
  const [endDate, setEndDate] = usePersistedState("bk:income-statement:end", defaults.end);
  const [report, setReport] = useState<IncomeStatementReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/income-statement?start=${startDate}&end=${endDate}`)
      .then((r) => r.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-lg font-semibold">Income Statement</h1>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <label className="text-text-muted">From</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="control-input px-2 py-1.5"
            />
            <label className="text-text-muted">To</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="control-input px-2 py-1.5"
            />
          </div>
          <ExportMenu
            buildHref={(format: ExportFormat) =>
              `/api/reports/income-statement/export?start=${startDate}&end=${endDate}&format=${format}`
            }
          />
        </div>
      </div>

      {loading || !report ? (
        <CardSkeleton lines={6} />
      ) : (
        <div className="max-w-3xl space-y-4">
          <SummaryTiles report={report} />

          <Section title="Revenue" total={report.revenueTotal}>
            {report.revenue.map((l) => (
              <LineRow key={l.categoryId} label={l.categoryName} amount={l.total} />
            ))}
          </Section>

          <Section title="Cost of Sales" total={report.costOfSalesTotal}>
            {report.costOfSales.map((l) => (
              <LineRow key={l.categoryId} label={l.categoryName} amount={l.total} />
            ))}
          </Section>

          <HighlightRow label="Gross Profit" amount={report.grossProfit} />

          <Section title="Operating Expenses" total={report.operatingExpensesTotal}>
            {report.operatingExpenses.map((l) => (
              <LineRow key={l.categoryId} label={l.categoryName} amount={l.total} />
            ))}
          </Section>

          <HighlightRow label="Net Profit" amount={report.netProfit} bold />
        </div>
      )}
    </div>
  );
}

function SummaryTiles({ report }: { report: IncomeStatementReport }) {
  return (
    <div className="surface-card flex flex-wrap items-center gap-x-10 gap-y-4 p-5">
      <div>
        <div
          className={`font-display text-2xl font-semibold ${report.netProfit < 0 ? "text-error" : ""}`}
        >
          {centsToDollarsString(report.netProfit)}
        </div>
        <div className="text-xs text-text-muted">Net Profit</div>
      </div>
      <div className="h-10 w-px bg-border-strong" />
      <div>
        <div className="font-display text-lg font-semibold">{centsToDollarsString(report.grossProfit)}</div>
        <div className="text-xs text-text-muted">Gross Profit</div>
      </div>
      <div>
        <div className="font-display text-lg font-semibold">
          {centsToDollarsString(report.operatingExpensesTotal)}
        </div>
        <div className="text-xs text-text-muted">Operating Expenses</div>
      </div>
    </div>
  );
}

function Section({
  title,
  total,
  children,
}: {
  title: string;
  total: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = usePersistedState(`bk:income-statement:section:${title}`, true);
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="surface-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
          <svg
            viewBox="0 0 20 20"
            width="12"
            height="12"
            fill="currentColor"
            className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          >
            <path d="M7 5l6 5-6 5V5z" />
          </svg>
          {title}
        </span>
        <span className="font-medium">{centsToDollarsString(total)}</span>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-2">
          {hasRows ? children : <p className="py-2 text-sm text-text-muted">No transactions in this range.</p>}
        </div>
      )}
    </div>
  );
}

function LineRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-b-0">
      <span>{label}</span>
      <span className="text-text-muted">{centsToDollarsString(amount)}</span>
    </div>
  );
}

function HighlightRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div
      className={`surface-card flex items-center justify-between px-5 py-3 ${bold ? "font-semibold" : "font-medium"}`}
    >
      <span>{label}</span>
      <span className={amount < 0 ? "text-error" : ""}>{centsToDollarsString(amount)}</span>
    </div>
  );
}
