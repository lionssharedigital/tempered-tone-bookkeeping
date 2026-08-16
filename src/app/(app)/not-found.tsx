import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-6xl">
      <EmptyState
        title="Page not found"
        message="That page doesn't exist or may have moved."
        action={
          <Link href="/transactions" className="btn-primary inline-block px-4 py-1.5 text-sm font-medium">
            Back to transactions
          </Link>
        }
      />
    </div>
  );
}
