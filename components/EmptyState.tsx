interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = "📭",
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-14 text-center">
      <span className="text-4xl opacity-40" aria-hidden>
        {icon}
      </span>
      <p className="mt-4 text-base font-medium text-primary">{title}</p>
      {message && (
        <p className="mt-2 max-w-md text-sm text-secondary">{message}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
