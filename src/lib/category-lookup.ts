import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { categories, CategoryType, CategoryClassification } from "../../db/schema";

/**
 * Finds a category by (name, type), creating it if needed. When an existing
 * category is found and a classification is passed, the category's
 * classification is updated to match — classification lives on the category,
 * shared across every rule that points to it, not per-rule.
 */
export function getOrCreateCategory(
  name: string,
  type: CategoryType,
  classification?: CategoryClassification,
): number {
  const existing = db
    .select()
    .from(categories)
    .all()
    .find((c) => c.name === name && c.type === type);

  if (existing) {
    if (classification && classification !== existing.classification) {
      db.update(categories).set({ classification }).where(eq(categories.id, existing.id)).run();
    }
    return existing.id;
  }

  const [created] = db
    .insert(categories)
    .values({ name, type, ...(classification ? { classification } : {}) })
    .returning()
    .all();
  return created.id;
}
