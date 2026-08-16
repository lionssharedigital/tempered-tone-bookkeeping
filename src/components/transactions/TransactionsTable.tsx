"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountRow, CategoryRow, TransactionRow } from "@/lib/types";
import { centsToDollarsString, dollarsStringToCents } from "@/lib/money";
import { SortableHeader, compareForSort, type SortDirection } from "@/components/ui/SortableHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ExportMenu from "@/components/ui/ExportMenu";
import type { ExportFormat } from "@/lib/export";
import { usePersistedState } from "@/lib/usePersistedState";

type SortField = "date" | "payee" | "account" | "category" | "amount" | "description";

export default function TransactionsTable() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accountFilter, setAccountFilter] = usePersistedState("bk:transactions:accountFilter", "");
  const [categoryFilter, setCategoryFilter] = usePersistedState("bk:transactions:categoryFilter", "");
  const [dateFrom, setDateFrom] = usePersistedState("bk:transactions:dateFrom", "");
  const [dateTo, setDateTo] = usePersistedState("bk:transactions:dateTo", "");
  const [q, setQ] = usePersistedState("bk:transactions:q", "");

  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<{
    scanned: number;
    updated: number;
  } | null>(null);

  const [sortField, setSortField] = usePersistedState<SortField>("bk:transactions:sortField", "date");
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(
    "bk:transactions:sortDirection",
    "desc",
  );

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (accountFilter) params.set("accountId", accountFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (q) params.set("q", q);

      const [txRes, acctRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`),
        accounts.length ? Promise.resolve(null) : fetch("/api/accounts"),
        categories.length ? Promise.resolve(null) : fetch("/api/categories"),
      ]);
      setTransactions(await txRes.json());
      if (acctRes) setAccounts(await acctRes.json());
      if (catRes) setCategories(await catRes.json());
      setError(null);
    } catch {
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountFilter, categoryFilter, dateFrom, dateTo, q]);

  useEffect(() => {
    // load() only sets state after its internal awaits resolve; it's reused
    // across filter changes so isn't inlined here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function updateTransaction(id: number, updates: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to update.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update transaction.");
    }
  }

  async function deleteTransaction(id: number) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  async function reprocessCategories() {
    setReprocessing(true);
    setReprocessResult(null);
    setError(null);
    try {
      const res = await fetch("/api/transactions/reprocess-categories", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReprocessResult({ scanned: data.scanned, updated: data.updated });
      await load();
    } catch {
      setError("Failed to reprocess categories.");
    } finally {
      setReprocessing(false);
    }
  }

  function buildExportHref(format: ExportFormat) {
    const params = new URLSearchParams();
    if (accountFilter) params.set("accountId", accountFilter);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (q) params.set("q", q);
    params.set("format", format);
    return `/api/transactions/export?${params.toString()}`;
  }

  const total = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amountCents, 0),
    [transactions],
  );

  const sortedTransactions = useMemo(() => {
    const valueFor = (t: TransactionRow): string | number | null => {
      switch (sortField) {
        case "date":
          return t.date;
        case "payee":
          return t.payee;
        case "account":
          return t.accountName;
        case "category":
          return t.categoryName;
        case "amount":
          return t.amountCents;
        case "description":
          return t.description;
      }
    };
    return [...transactions].sort((a, b) =>
      compareForSort(valueFor(a), valueFor(b), sortDirection),
    );
  }, [transactions, sortField, sortDirection]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">Transactions</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={reprocessCategories}
            disabled={reprocessing}
            title="Re-apply Category Map rules to uncategorized and auto-matched transactions. Manually-set categories are never overwritten."
            className="btn-secondary px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {reprocessing ? "Reprocessing..." : "Reprocess categories"}
          </button>
          <ExportMenu buildHref={buildExportHref} />
          <Link href="/transactions/new" className="btn-primary px-4 py-1.5 text-sm font-medium">
            + New transaction
          </Link>
        </div>
      </div>

      {reprocessResult && (
        <p className="mb-4 text-sm text-success">
          Scanned {reprocessResult.scanned} uncategorized/auto-matched transaction
          {reprocessResult.scanned === 1 ? "" : "s"} &middot; updated {reprocessResult.updated}.
        </p>
      )}

      <div className="surface-card mb-4 flex flex-wrap items-end gap-3 p-4">
        <FilterField label="Account">
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="control-input px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Category">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="control-input px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="From">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="control-input px-2 py-1.5 text-sm"
          />
        </FilterField>
        <FilterField label="To">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="control-input px-2 py-1.5 text-sm"
          />
        </FilterField>
        <FilterField label="Search payee">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Freshbooks"
            className="control-input w-48 px-2 py-1.5 text-sm"
          />
        </FilterField>
      </div>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      {loading ? (
        <TableSkeleton columns={7} rows={10} />
      ) : transactions.length === 0 && !accountFilter && !categoryFilter && !dateFrom && !dateTo && !q ? (
        <EmptyState
          title="No transactions yet"
          message="Add one by hand or import a CSV/PDF statement to get started."
          action={
            <Link href="/import" className="btn-primary inline-block px-4 py-1.5 text-sm font-medium">
              Import transactions
            </Link>
          }
        />
      ) : (
        <>
          <div className="table-shell overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium uppercase">
                <tr>
                  <SortableHeader
                    label="Date"
                    field="date"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Payee"
                    field="payee"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Account"
                    field="account"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Category"
                    field="category"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Amount"
                    field="amount"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Description"
                    field="description"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((t) => (
                  <TransactionRowItem
                    key={t.id}
                    txn={t}
                    accounts={accounts}
                    categories={categories}
                    onUpdate={(updates) => updateTransaction(t.id, updates)}
                    onDelete={() => deleteTransaction(t.id)}
                  />
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                      No transactions match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            {transactions.length} transaction{transactions.length === 1 ? "" : "s"} &middot; net{" "}
            {centsToDollarsString(total)}
            {transactions.length >= 10000 && (
              <span className="ml-2 text-warning">
                (showing the first 10,000 &mdash; narrow with filters above to see the rest)
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-muted">{label}</label>
      {children}
    </div>
  );
}

function TransactionRowItem({
  txn,
  accounts,
  categories,
  onUpdate,
  onDelete,
}: {
  txn: TransactionRow;
  accounts: AccountRow[];
  categories: CategoryRow[];
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [payee, setPayee] = useState(txn.payee);
  const [amount, setAmount] = useState(centsToDollarsString(txn.amountCents));
  const [description, setDescription] = useState(txn.description ?? "");

  function commitPayee() {
    if (payee !== txn.payee) onUpdate({ payee });
  }
  function commitAmount() {
    try {
      const cents = dollarsStringToCents(amount);
      if (cents !== txn.amountCents) onUpdate({ amountCents: cents });
    } catch {
      setAmount(centsToDollarsString(txn.amountCents));
    }
  }
  function commitDescription() {
    if (description !== (txn.description ?? "")) onUpdate({ description });
  }

  const inlineInput =
    "rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none";

  return (
    <tr>
      <td className="whitespace-nowrap px-4 py-2 text-text-muted">{txn.date}</td>
      <td className="px-4 py-2">
        <input value={payee} onChange={(e) => setPayee(e.target.value)} onBlur={commitPayee} className={`w-40 ${inlineInput}`} />
      </td>
      <td className="px-4 py-2">
        <select
          value={txn.accountId}
          onChange={(e) => onUpdate({ accountId: Number(e.target.value) })}
          className={inlineInput}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select
          value={txn.categoryId ?? ""}
          onChange={(e) =>
            onUpdate({
              categoryId: e.target.value ? Number(e.target.value) : null,
              categorySource: "manual",
            })
          }
          className={inlineInput + (txn.categoryId ? "" : " text-warning")}
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-right">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={commitAmount}
          className={`w-28 text-right ${inlineInput} ` + (txn.amountCents < 0 ? "text-error" : "text-success")}
        />
      </td>
      <td className="px-4 py-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
          className={`w-48 text-text-muted ${inlineInput}`}
        />
      </td>
      <td className="px-4 py-2 text-right">
        <button onClick={onDelete} className="text-xs text-error transition-opacity hover:opacity-70">
          Delete
        </button>
      </td>
    </tr>
  );
}
