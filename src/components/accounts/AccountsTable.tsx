"use client";

import { useEffect, useMemo, useState } from "react";
import type { AccountRow, AccountType } from "@/lib/types";
import { centsToDollarsString, dollarsStringToCents } from "@/lib/money";
import { SortableHeader, compareForSort, type SortDirection } from "@/components/ui/SortableHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { usePersistedState } from "@/lib/usePersistedState";

const ACCOUNT_TYPES: AccountType[] = ["bank", "credit_card"];

type SortField = "name" | "institution" | "type" | "openingBalance" | "openingDate";

export default function AccountsTable() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = usePersistedState("bk:accounts:showArchived", false);

  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("bank");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openingDate, setOpeningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/accounts");
      setAccounts(await res.json());
    } catch {
      setError("Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // load() only sets state after its internal awaits resolve; it's shared
    // with the add/update/archive handlers so isn't inlined here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !institution.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          institution: institution.trim(),
          accountType,
          openingBalanceCents: dollarsStringToCents(openingBalance || "0"),
          openingBalanceDate: openingDate,
        }),
      });
      if (!res.ok) throw new Error();
      setName("");
      setInstitution("");
      setOpeningBalance("0");
      await load();
    } catch {
      setError("Failed to add account. Check the opening balance format.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAccount(id: number, updates: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Failed to update account.");
    }
  }

  async function archiveAccount(id: number) {
    if (!confirm("Archive this account? It will be hidden but its transactions are kept.")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await load();
  }

  const [sortField, setSortField] = usePersistedState<SortField | null>("bk:accounts:sortField", null);
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(
    "bk:accounts:sortDirection",
    "asc",
  );

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const visibleAccounts = useMemo(() => {
    const filtered = accounts.filter((a) => showArchived || !a.isArchived);
    if (!sortField) return filtered; // default: the accounts' own sortOrder (Profit First envelope order)
    const valueFor = (a: AccountRow): string | number => {
      switch (sortField) {
        case "name":
          return a.name;
        case "institution":
          return a.institution;
        case "type":
          return a.accountType;
        case "openingBalance":
          return a.openingBalanceCents;
        case "openingDate":
          return a.openingBalanceDate;
      }
    };
    return [...filtered].sort((a, b) => compareForSort(valueFor(a), valueFor(b), sortDirection));
  }, [accounts, showArchived, sortField, sortDirection]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">Accounts</h1>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      <form onSubmit={addAccount} className="surface-card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Operating Expenses"
            className="control-input w-48 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Institution</label>
          <input
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. Relay"
            className="control-input w-32 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Type</label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            className="control-input px-2 py-1.5 text-sm"
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "bank" ? "Bank" : "Credit Card"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Opening balance
          </label>
          <input
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="0.00"
            className="control-input w-28 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">As of</label>
          <input
            type="date"
            value={openingDate}
            onChange={(e) => setOpeningDate(e.target.value)}
            className="control-input px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary px-4 py-1.5 text-sm font-medium disabled:opacity-50">
          Add account
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      {loading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : visibleAccounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          message="Add your first account above to start tracking balances."
        />
      ) : (
        <div className="table-shell">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase">
              <tr>
                <SortableHeader
                  label="Name"
                  field="name"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Institution"
                  field="institution"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Type"
                  field="type"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Opening balance"
                  field="openingBalance"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="As of"
                  field="openingDate"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.map((a) => (
                <AccountRowItem
                  key={a.id}
                  account={a}
                  onUpdate={(updates) => updateAccount(a.id, updates)}
                  onArchive={() => archiveAccount(a.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AccountRowItem({
  account,
  onUpdate,
  onArchive,
}: {
  account: AccountRow;
  onUpdate: (updates: Record<string, unknown>) => void;
  onArchive: () => void;
}) {
  const [balance, setBalance] = useState(centsToDollarsString(account.openingBalanceCents));

  function commitBalance() {
    try {
      const cents = dollarsStringToCents(balance);
      if (cents !== account.openingBalanceCents) onUpdate({ openingBalanceCents: cents });
    } catch {
      setBalance(centsToDollarsString(account.openingBalanceCents));
    }
  }

  return (
    <tr className={account.isArchived ? "opacity-50" : ""}>
      <td className="px-4 py-2 font-medium">{account.name}</td>
      <td className="px-4 py-2 text-text-muted">{account.institution}</td>
      <td className="px-4 py-2 text-text-muted">
        {account.accountType === "bank" ? "Bank" : "Credit Card"}
      </td>
      <td className="px-4 py-2">
        <input
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          onBlur={commitBalance}
          className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="date"
          defaultValue={account.openingBalanceDate}
          onBlur={(e) => {
            if (e.target.value !== account.openingBalanceDate) {
              onUpdate({ openingBalanceDate: e.target.value });
            }
          }}
          className="rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
        />
      </td>
      <td className="px-4 py-2 text-right">
        {!account.isArchived && (
          <button onClick={onArchive} className="text-xs text-error transition-opacity hover:opacity-70">
            Archive
          </button>
        )}
      </td>
    </tr>
  );
}
