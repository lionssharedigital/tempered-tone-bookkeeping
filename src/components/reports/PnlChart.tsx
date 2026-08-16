"use client";

import { useMemo, useState } from "react";
import { centsToDollarsString } from "@/lib/money";

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

// Categorical slots 1 (blue) and 2 (orange) from the validated default
// palette, in fixed order -- not hand-picked red/green, which fails CVD
// separation checks.
const INCOME_COLOR = "#2a78d6";
const EXPENSE_COLOR = "#eb6834";

const WIDTH = 900;
const HEIGHT = 260;
const MARGIN = { top: 12, right: 16, bottom: 28, left: 64 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const BAR_MAX_WIDTH = 20;
const BAR_GAP = 2;

/** Rounds a max value up to a "nice" number for gridline steps (e.g. 12,345 -> 15,000). */
function niceCeiling(value: number): number {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

interface HoveredBar {
  month: string;
  series: "Income" | "Expense";
  valueCents: number;
  x: number;
  y: number;
}

export default function PnlChart({
  incomeMonthly,
  expenseMonthly,
}: {
  incomeMonthly: number[];
  expenseMonthly: number[];
}) {
  const [hovered, setHovered] = useState<HoveredBar | null>(null);

  const maxCents = useMemo(() => {
    const max = Math.max(0, ...incomeMonthly, ...expenseMonthly);
    return niceCeiling(max || 100);
  }, [incomeMonthly, expenseMonthly]);

  const gridlineCount = 4;
  const gridlines = Array.from({ length: gridlineCount + 1 }, (_, i) => (maxCents / gridlineCount) * i);

  const groupWidth = PLOT_WIDTH / 12;
  const barWidth = Math.min(BAR_MAX_WIDTH, (groupWidth - BAR_GAP) / 2);

  function yFor(valueCents: number) {
    return PLOT_HEIGHT - (valueCents / maxCents) * PLOT_HEIGHT;
  }

  return (
    <div className="surface-card relative mb-6 p-4">
      <div className="mb-3 flex items-center gap-4 text-xs text-text-muted">
        <LegendSwatch color={INCOME_COLOR} label="Income" />
        <LegendSwatch color={EXPENSE_COLOR} label="Expense" />
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          style={{ minWidth: 600 }}
          role="img"
          aria-label="Monthly income and expense chart"
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {gridlines.map((value, i) => {
              const y = yFor(value);
              return (
                <g key={i}>
                  <line
                    x1={0}
                    x2={PLOT_WIDTH}
                    y1={y}
                    y2={y}
                    stroke="var(--grid-line)"
                    strokeWidth={1}
                  />
                  <text
                    x={-8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={10}
                    fill="var(--text-muted)"
                  >
                    {centsToDollarsString(value).replace(".00", "")}
                  </text>
                </g>
              );
            })}
            <line
              x1={0}
              x2={PLOT_WIDTH}
              y1={PLOT_HEIGHT}
              y2={PLOT_HEIGHT}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />

            {MONTH_LABELS.map((month, i) => {
              const groupX = i * groupWidth + (groupWidth - (barWidth * 2 + BAR_GAP)) / 2;
              const income = incomeMonthly[i] ?? 0;
              const expense = expenseMonthly[i] ?? 0;
              const incomeY = yFor(income);
              const expenseY = yFor(expense);

              return (
                <g key={month}>
                  <text
                    x={i * groupWidth + groupWidth / 2}
                    y={PLOT_HEIGHT + 16}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--text-muted)"
                  >
                    {month}
                  </text>
                  <rect
                    x={groupX}
                    y={incomeY}
                    width={barWidth}
                    height={Math.max(0, PLOT_HEIGHT - incomeY)}
                    rx={4}
                    fill={INCOME_COLOR}
                    className="cursor-default transition-opacity duration-150 hover:opacity-80"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHovered({
                        month,
                        series: "Income",
                        valueCents: income,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHovered(null)}
                  />
                  <rect
                    x={groupX + barWidth + BAR_GAP}
                    y={expenseY}
                    width={barWidth}
                    height={Math.max(0, PLOT_HEIGHT - expenseY)}
                    rx={4}
                    fill={EXPENSE_COLOR}
                    className="cursor-default transition-opacity duration-150 hover:opacity-80"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHovered({
                        month,
                        series: "Expense",
                        valueCents: expense,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHovered(null)}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {hovered && (
        <div
          className="surface-card pointer-events-none fixed z-10 -translate-x-1/2 -translate-y-full px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hovered.x, top: hovered.y - 8 }}
        >
          <div className="font-semibold">{centsToDollarsString(hovered.valueCents)}</div>
          <div className="text-text-muted">
            {hovered.series} &middot; {hovered.month}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
