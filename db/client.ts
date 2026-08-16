import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

// Lazily opened: Next.js's build-time "Collecting page data" step imports
// every route module (including this one) inside worker threads, and
// better-sqlite3's native addon is not safe to initialize off the main
// thread — it segfaults there. Deferring the actual `new Database(...)`
// call until first real use means the build only ever imports this module
// (harmless); the connection is only opened once the app is genuinely
// serving requests in the main process.
let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database<typeof schema> | null = null;

function getSqlite(): Database.Database {
  if (_sqlite) return _sqlite;
  const DATABASE_PATH =
    process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "bookkeeping.sqlite");
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
  _sqlite = new Database(DATABASE_PATH);
  // Not WAL: WAL mode depends on mmap'd shared memory between the main db
  // file and its -wal/-shm siblings, which Docker Desktop's virtualized
  // bind-mount filesystem on macOS doesn't reliably support and can crash
  // on. This app is single-process/single-writer, so WAL's concurrent-
  // reader benefit doesn't apply here anyway.
  _sqlite.pragma("journal_mode = DELETE");
  _sqlite.pragma("foreign_keys = ON");
  return _sqlite;
}

function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;
  _db = drizzle(getSqlite(), { schema });
  return _db;
}

export const db: BetterSQLite3Database<typeof schema> = new Proxy(
  {} as BetterSQLite3Database<typeof schema>,
  {
    get(_target, prop) {
      const real = getDb();
      const value = Reflect.get(real as object, prop, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
  },
);

export const sqlite: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const real = getSqlite();
    const value = Reflect.get(real as object, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
