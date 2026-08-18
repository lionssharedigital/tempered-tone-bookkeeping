"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form onSubmit={handleSubmit} className="surface-card w-full max-w-sm p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo textColor="var(--text)" />
        </div>
        <p className="mb-6 text-center text-sm text-text-muted">Sign in to continue.</p>
        <label className="mb-1 block text-sm font-medium text-text-muted">Password</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="control-input mb-4 w-full px-3 py-2 text-sm"
        />
        {error && <p className="mb-4 text-sm text-error">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full px-3 py-2 text-sm font-medium disabled:opacity-50">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
