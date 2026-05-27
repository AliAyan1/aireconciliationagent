export function FraudAlertBadge({ message }: { message: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 text-[10px] font-medium text-[var(--warning)]"
      title={message}
    >
      ⚠️ Fraud alert
    </span>
  );
}
