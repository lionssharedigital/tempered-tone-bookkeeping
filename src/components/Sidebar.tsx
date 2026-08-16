"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";

const LINKS = [
  { href: "/transactions", label: "Transactions" },
  { href: "/import", label: "Import" },
  { href: "/categories", label: "Category Map" },
  { href: "/accounts", label: "Accounts" },
  { href: "/reports/profit-loss", label: "P&L" },
  { href: "/reports/balance-sheet", label: "Balance Sheet" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed top-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full md:hidden"
        style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-text)" }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={
          "fixed inset-0 z-30 bg-black/55 backdrop-blur-sm transition-opacity duration-300 md:hidden " +
          (mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />

      <aside
        className={
          "fixed md:sticky inset-y-0 left-0 top-0 z-40 md:z-auto flex h-screen w-60 shrink-0 flex-col " +
          "transition-transform duration-300 ease-out md:translate-x-0 " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full")
        }
        style={{ background: "var(--sidebar-bg)" }}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150"
                style={{
                  color: active ? "#fff" : "var(--sidebar-text)",
                  background: active ? "var(--accent)" : "transparent",
                  opacity: active ? 1 : 0.72,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderTop: "1px solid var(--sidebar-line)" }}
        >
          <button
            onClick={handleLogout}
            className="text-sm font-medium transition-opacity duration-150 hover:opacity-100"
            style={{ color: "var(--sidebar-text)", opacity: 0.72 }}
          >
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
