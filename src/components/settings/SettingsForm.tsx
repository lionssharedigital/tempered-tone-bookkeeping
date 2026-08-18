"use client";

import { useEffect, useRef, useState } from "react";
import { isValidHexColor } from "@/lib/color";
import { CardSkeleton } from "@/components/ui/Skeleton";

const DEFAULT_ACCENT = "#e8632a";
const MAX_LOGO_BYTES = 2_000_000;

interface BrandingSettings {
  accentColor: string | null;
  logoDataUri: string | null;
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [accentInput, setAccentInput] = useState(DEFAULT_ACCENT);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: BrandingSettings) => {
        setSettings(data);
        setAccentInput(data.accentColor ?? DEFAULT_ACCENT);
        setLogoPreview(data.logoDataUri);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleLogoFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo image is too large (max 2MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.onerror = () => setError("Failed to read that file.");
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setError(null);
    if (!isValidHexColor(accentInput)) {
      setError("Accent color must be a hex value like #e8632a.");
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor: accentInput, logoDataUri: logoPreview }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      // Accent color and logo are read server-side in the root layout for
      // zero-flash rendering, so a full reload is what actually picks up
      // the change everywhere (sidebar, buttons, links, login page).
      setTimeout(() => window.location.reload(), 400);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor: null, logoDataUri: null }),
      });
      if (!res.ok) throw new Error();
      setTimeout(() => window.location.reload(), 400);
    } catch {
      setError("Failed to reset settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <CardSkeleton lines={4} />;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="surface-card p-6">
        <h2 className="mb-1 font-display text-base font-semibold">Accent color</h2>
        <p className="mb-4 text-sm text-text-muted">
          Used for buttons, links, the active nav item, and highlights throughout the app.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={isValidHexColor(accentInput) ? accentInput : DEFAULT_ACCENT}
            onChange={(e) => setAccentInput(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-border-strong bg-transparent p-1"
            aria-label="Accent color picker"
          />
          <input
            value={accentInput}
            onChange={(e) => setAccentInput(e.target.value)}
            placeholder="#e8632a"
            className="control-input w-32 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setAccentInput(DEFAULT_ACCENT)}
            className="text-sm text-text-muted transition-opacity hover:opacity-70"
          >
            Use default
          </button>
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="mb-1 font-display text-base font-semibold">Logo</h2>
        <p className="mb-4 text-sm text-text-muted">
          Shown top-left in the sidebar and on the sign-in page. PNG, JPG, or SVG, up to 2MB.
        </p>
        <div className="flex items-center gap-4">
          <div className="surface-card flex h-16 w-16 items-center justify-center overflow-hidden p-2">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-text-muted">Default</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFile(file);
              }}
              className="text-sm"
            />
            {logoPreview && (
              <button
                type="button"
                onClick={() => {
                  setLogoPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="self-start text-sm text-error transition-opacity hover:opacity-70"
              >
                Remove logo
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {saved && <p className="text-sm text-success">Saved — reloading...</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="btn-secondary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
