"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountRow } from "@/lib/types";

export default function ImportUpload() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountId, setAccountId] = useState<number | "">("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((rows: AccountRow[]) => {
        setAccounts(rows.filter((a) => !a.isArchived));
        if (rows.length) setAccountId(rows[0].id);
      });
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file || !accountId) {
      setError("Choose an account and a file.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("accountId", String(accountId));
      const res = await fetch("/api/import/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      router.push(`/import/${data.batchId}/review`);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-display text-lg font-semibold">Import transactions</h1>
      <form onSubmit={handleUpload} className="surface-card space-y-4 p-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(Number(e.target.value))}
            className="control-input w-full px-3 py-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.institution})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">CSV or PDF file</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,.pdf,application/pdf"
            className="w-full text-sm"
          />
          <p className="mt-1 text-xs text-text-muted">
            Export a CSV from Relay or Chase, or upload a bank statement PDF (best-effort
            extraction). You&apos;ll map columns and review categorization on the next screen
            before anything is saved.
          </p>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <button type="submit" disabled={uploading} className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50">
          {uploading ? "Uploading..." : "Upload & continue"}
        </button>
      </form>
    </div>
  );
}
