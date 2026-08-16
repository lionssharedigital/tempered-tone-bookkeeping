export interface CategoryRuleLike {
  id: number;
  keyword: string;
  categoryId: number;
  priority: number;
  isActive: boolean;
}

/**
 * Matches a payee string against category map rules the same way the
 * original spreadsheet's SEARCH-based lookup worked: case-insensitive
 * substring match. Ties are broken by rule priority (sheet order, earlier
 * rows win), then by longest keyword (more specific match wins).
 */
export function matchCategoryRule<T extends CategoryRuleLike>(
  payee: string,
  rules: T[],
): T | null {
  const haystack = payee.toLowerCase();
  const candidates = rules.filter(
    (r) => r.isActive && haystack.includes(r.keyword.toLowerCase()),
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.keyword.length - a.keyword.length;
  });
  return candidates[0];
}
