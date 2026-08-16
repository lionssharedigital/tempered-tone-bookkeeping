"use client";

import EmptyState from "@/components/ui/EmptyState";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl">
      <EmptyState
        title="Something went wrong"
        message={error.message || "An unexpected error occurred while loading this page."}
        action={
          <button onClick={reset} className="btn-primary px-4 py-1.5 text-sm font-medium">
            Try again
          </button>
        }
      />
    </div>
  );
}
