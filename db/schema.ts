import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

export const CATEGORY_TYPES = [
  "Income",
  "Expense",
  "Transfer",
  "Credit Card",
] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const ACCOUNT_TYPES = ["bank", "credit_card"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  institution: text("institution").notNull(),
  accountType: text("account_type").$type<AccountType>().notNull().default("bank"),
  openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
  openingBalanceDate: text("opening_balance_date").notNull(),
  currency: text("currency").notNull().default("USD"),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    type: text("type").$type<CategoryType>().notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [uniqueIndex("uq_categories_name_type").on(table.name, table.type)],
);

export const categoryMapRules = sqliteTable(
  "category_map_rules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    keyword: text("keyword").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    priority: integer("priority").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [index("idx_category_map_keyword").on(table.keyword)],
);

export const importBatches = sqliteTable(
  "import_batches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    sourceType: text("source_type").$type<"csv" | "pdf">().notNull(),
    originalFilename: text("original_filename").notNull(),
    fileHash: text("file_hash").notNull(),
    columnMappingJson: text("column_mapping_json"),
    rowCount: integer("row_count").notNull().default(0),
    importedCount: integer("imported_count").notNull().default(0),
    skippedDuplicateCount: integer("skipped_duplicate_count").notNull().default(0),
    status: text("status")
      .$type<"pending_review" | "committed" | "discarded">()
      .notNull()
      .default("pending_review"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [index("idx_import_batches_file_hash").on(table.fileHash)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    date: text("date").notNull(), // ISO 'YYYY-MM-DD'
    payee: text("payee").notNull(),
    bankTransactionType: text("bank_transaction_type"),
    description: text("description"),
    reference: text("reference"),
    status: text("status").notNull().default("posted"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    categoryId: integer("category_id").references(() => categories.id),
    categorySource: text("category_source")
      .$type<"auto_matched" | "manual" | "unmatched">()
      .notNull()
      .default("unmatched"),
    matchedRuleId: integer("matched_rule_id").references(() => categoryMapRules.id),
    transferPairId: integer("transfer_pair_id"),
    notes: text("notes"),
    importBatchId: integer("import_batch_id").references(() => importBatches.id),
    dedupHash: text("dedup_hash").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_txn_account_date").on(table.accountId, table.date),
    index("idx_txn_category").on(table.categoryId),
    uniqueIndex("uq_txn_dedup").on(table.accountId, table.dedupHash),
  ],
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
