import type { DataQualityReport, QualityStatus } from "@/lib/upload-quality";

const STATUS_ICON: Record<QualityStatus, string> = {
  pass: "✓",
  warn: "⚠",
  fail: "✗",
};

const STATUS_CLASS: Record<QualityStatus, string> = {
  pass: "text-[var(--success)]",
  warn: "text-[var(--warning)]",
  fail: "text-[var(--danger)]",
};

interface UploadQualityReportProps {
  title: string;
  report: DataQualityReport | null;
}

export function UploadQualityReport({ title, report }: UploadQualityReportProps) {
  if (!report || report.checks.length === 0) return null;

  return (
    <div className="mt-4 w-full rounded-lg border border-default bg-elevated/80 px-4 py-3 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">
        {title}
      </p>
      <ul className="space-y-1.5">
        {report.checks.map((check) => (
          <li
            key={check.message}
            className={`flex items-start gap-2 text-sm ${STATUS_CLASS[check.status]}`}
          >
            <span className="shrink-0 font-semibold" aria-hidden>
              {STATUS_ICON[check.status]}
            </span>
            <span className="text-primary">{check.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
