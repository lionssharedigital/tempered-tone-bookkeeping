import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { appSettings } from "../../db/schema";

const PASSWORD_HASH_KEY = "auth_password_hash";

function ensureAdminPasswordHash(): string {
  const existing = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, PASSWORD_HASH_KEY))
    .all()[0];
  if (existing) return existing.value;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "No admin password is set. Set ADMIN_PASSWORD in the environment before first login.",
    );
  }
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.insert(appSettings).values({ key: PASSWORD_HASH_KEY, value: hash }).run();
  return hash;
}

export function verifyAdminPassword(password: string): boolean {
  const hash = ensureAdminPasswordHash();
  return bcrypt.compareSync(password, hash);
}
