"use client";

import { useEffect, useState } from "react";
import { applyTheme, readStoredTheme, type Theme } from "@/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Deferred to post-mount to avoid an SSR/hydration mismatch; the
    // no-flash head script already set the class before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readStoredTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className="group flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-150"
      style={{ borderColor: "var(--sidebar-line)" }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 transition-transform duration-300 ease-out group-hover:rotate-45"
        style={{ color: "var(--sidebar-text)" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        {theme === "dark" ? (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        )}
      </svg>
    </button>
  );
}
