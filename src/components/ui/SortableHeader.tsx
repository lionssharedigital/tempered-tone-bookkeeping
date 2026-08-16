"use client";

export type SortDirection = "asc" | "desc";

export function SortableHeader<T extends string>({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  align = "left",
}: {
  label: string;
  field: T;
  currentField: T | null;
  currentDirection: SortDirection;
  onSort: (field: T) => void;
  align?: "left" | "right";
}) {
  const active = currentField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={
        "cursor-pointer select-none px-4 py-2 transition-colors hover:text-text " +
        (align === "right" ? "text-right" : "text-left")
      }
    >
      <span className="inline-flex items-center gap-1">
        {align === "right" && <SortArrow active={active} direction={currentDirection} />}
        {label}
        {align === "left" && <SortArrow active={active} direction={currentDirection} />}
      </span>
    </th>
  );
}

function SortArrow({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span
      className={"text-[10px] transition-all duration-150 " + (active ? "text-accent" : "text-border-strong")}
      style={{ transform: active && direction === "desc" ? "rotate(0deg)" : "rotate(180deg)" }}
    >
      ▼
    </span>
  );
}

/** Generic comparator for table sorting: numeric fields compare numerically, everything else as strings. */
export function compareForSort(a: string | number | null, b: string | number | null, direction: SortDirection): number {
  const an = a ?? "";
  const bn = b ?? "";
  let cmp: number;
  if (typeof an === "number" && typeof bn === "number") {
    cmp = an - bn;
  } else {
    cmp = String(an).localeCompare(String(bn));
  }
  return direction === "asc" ? cmp : -cmp;
}
