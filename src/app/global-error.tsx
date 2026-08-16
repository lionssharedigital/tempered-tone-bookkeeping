"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0e1218", color: "#f0ebe0", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>Something went wrong</p>
          <button
            onClick={reset}
            style={{
              background: "#e8632a",
              color: "#fff",
              borderRadius: 999,
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
