import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client";
import path from "node:path";

migrate(db, { migrationsFolder: path.join(process.cwd(), "db", "migrations") });
console.log("Migrations applied.");
sqlite.close();
