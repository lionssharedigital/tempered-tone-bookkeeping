export default function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="font-display text-base font-semibold">{title}</p>
      {message && <p className="max-w-sm text-sm text-text-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
