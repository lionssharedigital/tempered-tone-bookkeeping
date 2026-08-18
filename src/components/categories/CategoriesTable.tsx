"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CategoryWithCountsRow, CategoryType, CategoryClassification } from "@/lib/types";
import { SortableHeader, compareForSort, type SortDirection } from "@/components/ui/SortableHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { usePersistedState } from "@/lib/usePersistedState";

const TYPES: CategoryType[] = ["Income", "Expense", "Cost of Sales", "Transfer", "Credit Card"];
const CLASSIFICATIONS: CategoryClassification[] = ["business", "personal"];

type SortField = "name" | "type" | "classification" | "ruleCount" | "transactionCount";

export default function CategoriesTable() {
  const [categoriesList, setCategoriesList] = useState<CategoryWithCountsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = usePersistedState("bk:categories:filter", "");

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("Expense");
  const [saving, setSaving] = useState(false);

  const [sortField, setSortField] = usePersistedState<SortField>("bk:categories:sortField", "type");
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(
    "bk:categories:sortDirection",
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

  async function load() {
    try {
      const res = await fetch("/api/categories");
      setCategoriesList(await res.json());
    } catch {
      setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // load() only sets state after its internal awaits resolve; it's shared
    // with the add/update/delete handlers so isn't inlined here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const filteredCategories = useMemo(() => {
    const f = filter.toLowerCase();
    const matches = categoriesList.filter((c) => c.name.toLowerCase().includes(f));
    const valueFor = (c: CategoryWithCountsRow): string | number => {
      switch (sortField) {
        case "name":
          return c.name;
        case "type":
          return c.type;
        case "classification":
          return c.classification;
        case "ruleCount":
          return c.ruleCount;
        case "transactionCount":
          return c.transactionCount;
      }
    };
    return matches.sort((a, b) => compareForSort(valueFor(a), valueFor(b), sortDirection));
  }, [categoriesList, filter, sortField, sortDirection]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      });
      if (!res.ok) throw new Error();
      setNewName("");
      await load();
    } catch {
      setError("Failed to add category.");
    } finally {
      setSaving(false);
    }
  }

  async function updateCategory(
    id: number,
    updates: { name?: string; type?: CategoryType; classification?: CategoryClassification },
  ) {
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update category.");
        await load(); // revert any optimistic edit back to the server value
        return;
      }
      await load();
    } catch {
      setError("Failed to update category.");
      await load();
    }
  }

  async function deleteCategory(category: CategoryWithCountsRow) {
    const parts: string[] = [];
    if (category.ruleCount > 0) parts.push(`${category.ruleCount} category map rule${category.ruleCount === 1 ? "" : "s"}`);
    if (category.transactionCount > 0) parts.push(`${category.transactionCount} transaction${category.transactionCount === 1 ? "" : "s"}`);
    const impact = parts.length > 0 ? ` This will remove ${parts.join(" and ")} (transactions become Uncategorized).` : "";
    if (!confirm(`Delete "${category.name}"?${impact}`)) return;

    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setCategoriesList((prev) => prev.filter((c) => c.id !== category.id));
      const noticeParts: string[] = [];
      if (data.deletedRuleCount > 0) noticeParts.push(`${data.deletedRuleCount} rule${data.deletedRuleCount === 1 ? "" : "s"} removed`);
      if (data.unassignedTransactionCount > 0) noticeParts.push(`${data.unassignedTransactionCount} transaction${data.unassignedTransactionCount === 1 ? "" : "s"} uncategorized`);
      setNotice(`Deleted "${category.name}".${noticeParts.length > 0 ? " " + noticeParts.join(", ") + "." : ""}`);
    } catch {
      setError("Failed to delete category.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-lg font-semibold">Categories</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/categories"
            className="text-sm text-accent-text transition-opacity hover:opacity-70"
          >
            &larr; Category Map
          </Link>
          <input
            placeholder="Filter by name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="control-input w-72 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <form onSubmit={addCategory} className="surface-card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Category name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Software"
            className="control-input w-48 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Type</label>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as CategoryType)}
            className="control-input px-2 py-1.5 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving} className="btn-primary px-4 py-1.5 text-sm font-medium disabled:opacity-50">
          Add category
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}
      {notice && <p className="mb-4 text-sm text-success">{notice}</p>}

      {loading ? (
        <TableSkeleton columns={6} rows={8} />
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
                  label="Type"
                  field="type"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Classification"
                  field="classification"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Rules"
                  field="ruleCount"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Transactions"
                  field="transactionCount"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onUpdate={(updates) => updateCategory(category.id, updates)}
                  onDelete={() => deleteCategory(category)}
                />
              ))}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                    {filter ? `No categories match "${filter}".` : "No categories yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  onUpdate,
  onDelete,
}: {
  category: CategoryWithCountsRow;
  onUpdate: (updates: { name?: string; type?: CategoryType; classification?: CategoryClassification }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [type, setType] = useState<CategoryType>(category.type);
  const [classification, setClassification] = useState<CategoryClassification>(category.classification);

  function commitName() {
    if (name.trim() && name !== category.name) onUpdate({ name: name.trim() });
  }
  function commitType(nextType: CategoryType) {
    setType(nextType);
    if (nextType !== category.type) onUpdate({ type: nextType });
  }
  function commitClassification(next: CategoryClassification) {
    setClassification(next);
    if (next !== category.classification) onUpdate({ classification: next });
  }

  return (
    <tr>
      <td className="px-4 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <select
          value={type}
          onChange={(e) => commitType(e.target.value as CategoryType)}
          className="rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select
          value={classification}
          onChange={(e) => commitClassification(e.target.value as CategoryClassification)}
          className="rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
        >
          {CLASSIFICATIONS.map((c) => (
            <option key={c} value={c}>
              {c === "business" ? "Business" : "Personal"}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-right text-text-muted">{category.ruleCount}</td>
      <td className="px-4 py-2 text-right text-text-muted">{category.transactionCount}</td>
      <td className="px-4 py-2 text-right">
        <button onClick={onDelete} className="text-xs text-error transition-opacity hover:opacity-70">
          Delete
        </button>
      </td>
    </tr>
  );
}
