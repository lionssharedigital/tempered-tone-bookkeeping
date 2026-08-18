import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { appSettings } from "../../db/schema";

const ACCENT_COLOR_KEY = "branding_accent_color";
const LOGO_DATA_URI_KEY = "branding_logo_data_uri";

export interface AppBrandingSettings {
  accentColor: string | null;
  logoDataUri: string | null;
}

function getSetting(key: string): string | null {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).all()[0];
  return row?.value ?? null;
}

function setSetting(key: string, value: string | null) {
  if (value === null) {
    db.delete(appSettings).where(eq(appSettings.key, key)).run();
    return;
  }
  const existing = db.select().from(appSettings).where(eq(appSettings.key, key)).all()[0];
  if (existing) {
    db.update(appSettings).set({ value }).where(eq(appSettings.key, key)).run();
  } else {
    db.insert(appSettings).values({ key, value }).run();
  }
}

export function getAppBranding(): AppBrandingSettings {
  return {
    accentColor: getSetting(ACCENT_COLOR_KEY),
    logoDataUri: getSetting(LOGO_DATA_URI_KEY),
  };
}

export function setAppBranding(updates: Partial<AppBrandingSettings>) {
  if ("accentColor" in updates) setSetting(ACCENT_COLOR_KEY, updates.accentColor ?? null);
  if ("logoDataUri" in updates) setSetting(LOGO_DATA_URI_KEY, updates.logoDataUri ?? null);
}
