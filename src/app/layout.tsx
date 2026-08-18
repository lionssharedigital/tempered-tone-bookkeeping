import type { Metadata } from "next";
import { Bricolage_Grotesque, Caveat, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { getAppBranding } from "@/lib/settings";
import { darken, lighten, withAlpha } from "@/lib/color";
import { SettingsProvider } from "@/components/SettingsProvider";
import "./globals.css";

// The root layout reads branding settings from the database on every
// render (for zero-flash accent color / logo). That must never happen
// during `next build`'s static generation pass -- touching better-sqlite3
// at build time is what caused the native-module crash this project hit
// early on. force-dynamic keeps every route rendered per-request instead,
// which this single-tenant, login-gated app already needs anyway.
export const dynamic = "force-dynamic";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tempered Tone Woods Bookkeeping",
  description: "Self-hosted bookkeeping for Tempered Tone Woods",
};

const noFlashScript = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

/** Renders a <style> override for the accent token family when a custom accent is set. */
function AccentColorStyle({ accentColor }: { accentColor: string | null }) {
  if (!accentColor) return null;
  const lightHover = darken(accentColor, 0.15);
  const darkHover = lighten(accentColor, 0.15);
  const css = `
:root {
  --accent: ${accentColor};
  --accent-hover: ${lightHover};
  --accent-text: ${lightHover};
  --accent-soft: ${withAlpha(accentColor, "1a")};
  --accent-tint: ${withAlpha(accentColor, "0d")};
  --accent-glow: ${withAlpha(accentColor, "2e")};
}
:root.dark {
  --accent: ${accentColor};
  --accent-hover: ${darkHover};
  --accent-text: ${darkHover};
  --accent-soft: ${withAlpha(accentColor, "24")};
  --accent-tint: ${withAlpha(accentColor, "12")};
  --accent-glow: ${withAlpha(accentColor, "4d")};
}
`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const branding = getAppBranding();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${geist.variable} ${geistMono.variable} ${bricolage.variable} ${instrumentSerif.variable} ${caveat.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        <AccentColorStyle accentColor={branding.accentColor} />
      </head>
      <body className="min-h-full font-sans">
        <SettingsProvider logoDataUri={branding.logoDataUri}>{children}</SettingsProvider>
      </body>
    </html>
  );
}
