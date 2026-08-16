"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategoryMapRuleRow, CategoryRow, CategoryType } from "@/lib/types";
import { SortableHeader, compareForSort, type SortDirection } from "@/components/ui/SortableHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { usePersistedState } from "@/lib/usePersistedState";

const TYPES: CategoryType[] = ["Income", "Expense", "Transfer", "Credit Card"];

type SortField = "keyword" | "category" | "type" | "priority";

export default function CategoryMapTable() {
  const [rules, setRules] = useState<CategoryMapRuleRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = usePersistedState("bk:category-map:filter", "");

  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState<CategoryType>("Expense");
  const [saving, setSaving] = useState(false);

  const [sortField, setSortField] = usePersistedState<SortField>("bk:category-map:sortField", "priority");
  const [sortDirection, setSortDirection] = usePersistedState<SortDirection>(
    "bk:category-map:sortDirection",
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

  async function load() {
    try {
      const [rulesRes, catsRes] = await Promise.all([
        fetch("/api/category-map"),
        fetch("/api/categories"),
      ]);
      setRules(await rulesRes.json());
      setCategories(await catsRes.json());
    } catch {
      setError("Failed to load category map.");
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

  const categoryNames = useMemo(
    () => Array.from(new Set(categories.map((c) => c.name))).sort(),
    [categories],
  );

  const filteredRules = useMemo(() => {
    const f = filter.toLowerCase();
    const matches = rules.filter(
      (r) =>
        r.keyword.toLowerCase().includes(f) || r.categoryName.toLowerCase().includes(f),
    );
    const valueFor = (r: CategoryMapRuleRow): string | number => {
      switch (sortField) {
        case "keyword":
          return r.keyword;
        case "category":
          return r.categoryName;
        case "type":
          return r.categoryType;
        case "priority":
          return r.priority;
      }
    };
    return matches.sort((a, b) => compareForSort(valueFor(a), valueFor(b), sortDirection));
  }, [rules, filter, sortField, sortDirection]);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim() || !newCategory.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/category-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newKeyword.trim(),
          categoryName: newCategory.trim(),
          categoryType: newType,
        }),
      });
      if (!res.ok) throw new Error();
      setNewKeyword("");
      setNewCategory("");
      await load();
    } catch {
      setError("Failed to add rule.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRule(id: number, updates: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/category-map/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Failed to update rule.");
    }
  }

  async function deleteRule(id: number) {
    if (!confirm("Delete this category map rule?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/category-map/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Failed to delete rule.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold">Category Map</h1>
        <input
          placeholder="Filter by keyword or category..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="control-input w-72 px-3 py-1.5 text-sm"
        />
      </div>

      <form onSubmit={addRule} className="surface-card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Payee keyword
          </label>
          <input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="e.g. FRESHBOOKS"
            className="control-input w-48 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Category</label>
          <input
            list="category-name-options"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. Software"
            className="control-input w-48 px-2 py-1.5 text-sm"
          />
          <datalist id="category-name-options">
            {categoryNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
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
          Add rule
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      {loading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : (
        <div className="table-shell">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase">
              <tr>
                <SortableHeader
                  label="Keyword"
                  field="keyword"
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
                  label="Type"
                  field="type"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Priority"
                  field="priority"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onUpdate={(updates) => updateRule(rule.id, updates)}
                  onDelete={() => deleteRule(rule.id)}
                />
              ))}
              {filteredRules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                    {filter ? `No rules match "${filter}".` : "No category map rules yet."}
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

function RuleRow({
  rule,
  onUpdate,
  onDelete,
}: {
  rule: CategoryMapRuleRow;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [keyword, setKeyword] = useState(rule.keyword);
  const [categoryName, setCategoryName] = useState(rule.categoryName);
  const [categoryType, setCategoryType] = useState<CategoryType>(rule.categoryType);
  const [priority, setPriority] = useState(rule.priority);

  function commitKeyword() {
    if (keyword !== rule.keyword) onUpdate({ keyword });
  }
  function commitCategory() {
    if (categoryName !== rule.categoryName || categoryType !== rule.categoryType) {
      onUpdate({ categoryName, categoryType });
    }
  }
  function commitPriority() {
    if (priority !== rule.priority) onUpdate({ priority });
  }

  return (
    <tr>
      <td className="px-4 py-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onBlur={commitKeyword}
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          list="category-name-options"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          onBlur={commitCategory}
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <select
          value={categoryType}
          onChange={(e) => {
            setCategoryType(e.target.value as CategoryType);
          }}
          onBlur={commitCategory}
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
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          onBlur={commitPriority}
          className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="checkbox"
          checked={rule.isActive}
          onChange={(e) => onUpdate({ isActive: e.target.checked })}
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
