"use client";

import { useEffect, useRef, useState } from "react";
import type { ExportFormat } from "@/lib/export";

export default function ExportMenu({ buildHref }: { buildHref: (format: ExportFormat) => string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary px-4 py-1.5 text-sm font-medium"
      >
        Export
      </button>
      {open && (
        <div className="surface-card absolute right-0 z-10 mt-1 w-40 overflow-hidden p-1 shadow-md" role="menu">
          <a
            href={buildHref("csv")}
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-hover"
            role="menuitem"
          >
            CSV
          </a>
          <a
            href={buildHref("xlsx")}
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-hover"
            role="menuitem"
          >
            Excel (.xlsx)
          </a>
        </div>
      )}
    </div>
  );
}
