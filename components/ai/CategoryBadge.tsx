import {
  categorizeDescription,
  type TransactionCategory,
} from "@/lib/transaction-categories";

const COLORS: Record<TransactionCategory, string> = {
  Salary: "bg-[rgba(139,92,246,0.15)] text-[var(--purple)]",
  Utilities: "bg-[rgba(59,130,246,0.15)] text-[var(--info)]",
  "Vendor Payments": "bg-[rgba(56,189,248,0.12)] text-accent",
  Tax: "bg-[rgba(239,68,68,0.12)] text-[var(--danger)]",
  "Bank Charges": "bg-[rgba(148,163,184,0.15)] text-secondary",
  Cash: "bg-[rgba(245,158,11,0.12)] text-[var(--warning)]",
  Transfers: "bg-[rgba(16,185,129,0.12)] text-[var(--success)]",
  "Mobile Wallet": "bg-[rgba(56,189,248,0.12)] text-accent",
  Other: "bg-card text-muted",
};

export function CategoryBadge({ description }: { description: string }) {
  const cat = categorizeDescription(description);
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${COLORS[cat]}`}
      title={`Category: ${cat}`}
    >
      {cat}
    </span>
  );
}
