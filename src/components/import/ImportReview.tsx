"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryRow } from "@/lib/types";
import type { ColumnMapping, MappingField } from "@/lib/csv/column-mapper";
import type { PreviewRow } from "@/lib/import/build-preview-rows";
import { centsToDollarsString } from "@/lib/money";
import { TableSkeleton } from "@/components/ui/Skeleton";

const FIELD_LABELS: Record<MappingField, string> = {
  date: "Date",
  payee: "Payee",
  amount: "Amount",
  description: "Description",
  reference: "Reference",
  bankTransactionType: "Transaction type",
  status: "Status",
};
const REQUIRED: MappingField[] = ["date", "payee", "amount"];
const OPTIONAL: MappingField[] = ["description", "reference", "bankTransactionType", "status"];

interface BatchInfo {
  batchId: number;
  accountId: number;
  accountName: string;
  status: string;
  rowCount: number;
  headers: string[];
  suggestedMapping: ColumnMapping;
}

export default function ImportReview({ batchId }: { batchId: number }) {
  const router = useRouter();
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skippedDuplicate: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/import/${batchId}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([b, cats]) => {
        setBatch(b);
        setMapping(b.suggestedMapping ?? {});
        setCategories(cats);
      })
      .catch(() => setError("Failed to load import batch."))
      .finally(() => setLoading(false));
  }, [batchId]);

  async function loadPreview() {
    setError(null);
    const missing = REQUIRED.filter((f) => !mapping[f]);
    if (missing.length) {
      setError(`Map required fields: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/import/${batchId}/mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to build preview.");
        return;
      }
      setRows(data.rows);
    } finally {
      setLoading(false);
    }
  }

  function toggleAccepted(idx: number, accepted: boolean) {
    setRows((prev) => prev && prev.map((r, i) => (i === idx ? { ...r, accepted } : r)));
  }

  function setCategoryForRow(idx: number, categoryId: number | null) {
    setRows(
      (prev) =>
        prev &&
        prev.map((r, i) =>
          i === idx ? { ...r, categoryId, matchedRuleId: null } : r,
        ),
    );
  }

  async function commit() {
    if (!rows) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/import/${batchId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Commit failed.");
        return;
      }
      setResult(data);
    } finally {
      setCommitting(false);
    }
  }

  if (loading && !batch) return <TableSkeleton columns={6} rows={6} />;
  if (!batch) return <p className="text-sm text-error">{error ?? "Batch not found."}</p>;

  if (result) {
    return (
      <div className="surface-card max-w-lg p-6">
        <h1 className="mb-2 font-display text-lg font-semibold">Import complete</h1>
        <p className="text-sm text-text-muted">
          Imported {result.imported} transaction{result.imported === 1 ? "" : "s"} into{" "}
          {batch.accountName}.
          {result.skippedDuplicate > 0 &&
            ` Skipped ${result.skippedDuplicate} duplicate${result.skippedDuplicate === 1 ? "" : "s"}.`}
        </p>
        <button
          onClick={() => router.push("/transactions")}
          className="btn-primary mt-4 px-4 py-2 text-sm font-medium"
        >
          View transactions
        </button>
      </div>
    );
  }

  if (batch.status === "committed") {
    return <p className="text-sm text-text-muted">This import batch was already committed.</p>;
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-lg font-semibold">
        Import into {batch.accountName} &middot; {batch.rowCount} rows
      </h1>
      <p className="mb-6 text-sm text-text-muted">
        Map your CSV columns, then review categorization before committing.
      </p>

      <div className="surface-card mb-6 flex flex-wrap gap-4 p-4">
        {[...REQUIRED, ...OPTIONAL].map((field) => (
          <div key={field}>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              {FIELD_LABELS[field]}
              {REQUIRED.includes(field) && " *"}
            </label>
            <select
              value={mapping[field] ?? ""}
              onChange={(e) =>
                setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))
              }
              className="control-input w-44 px-2 py-1.5 text-sm"
            >
              <option value="">-- none --</option>
              {batch.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex items-end">
          <button onClick={loadPreview} className="btn-primary px-4 py-1.5 text-sm font-medium">
            Preview
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      {rows && (
        <>
          <PreviewSummary rows={rows} />
          <div className="table-shell overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium uppercase">
                <tr>
                  <th className="px-3 py-2">Import</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Payee</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Flag</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      background: row.error
                        ? "var(--status-error-soft)"
                        : row.isDuplicate
                          ? "var(--status-warning-soft)"
                          : undefined,
                    }}
                  >
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={row.accepted}
                        disabled={!!row.error}
                        onChange={(e) => toggleAccepted(idx, e.target.checked)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-text-muted">{row.date ?? "—"}</td>
                    <td className="px-3 py-1.5">{row.payee}</td>
                    <td className="px-3 py-1.5 text-right">
                      {row.amountCents !== null ? centsToDollarsString(row.amountCents) : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={row.categoryId ?? ""}
                        onChange={(e) =>
                          setCategoryForRow(idx, e.target.value ? Number(e.target.value) : null)
                        }
                        className="control-input px-1 py-0.5 text-xs"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {row.error && <span className="text-error">{row.error}</span>}
                      {!row.error && row.isDuplicate && (
                        <span className="text-warning">Possible duplicate</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={commit}
              disabled={committing}
              className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {committing ? "Importing..." : `Commit ${rows.filter((r) => r.accepted).length} rows`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PreviewSummary({ rows }: { rows: PreviewRow[] }) {
  const accepted = rows.filter((r) => r.accepted).length;
  const duplicates = rows.filter((r) => r.isDuplicate).length;
  const errors = rows.filter((r) => r.error).length;
  const uncategorized = rows.filter((r) => r.accepted && !r.categoryId).length;
  return (
    <p className="mb-3 text-sm text-text-muted">
      {accepted} selected to import &middot; {duplicates} flagged as duplicates &middot; {errors} rows
      with errors &middot; {uncategorized} uncategorized
    </p>
  );
}
