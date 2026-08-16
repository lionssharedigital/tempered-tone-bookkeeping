export function TableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <div className="table-shell">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-grid-line px-4 py-3 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="skeleton h-3.5 flex-1"
              style={{ animationDelay: `${(r * columns + c) * 20}ms`, opacity: 0.6 + (0.4 * (rows - r)) / rows }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="surface-card space-y-2 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}
