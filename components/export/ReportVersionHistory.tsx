"use client";

import { useEffect, useState } from "react";
import {
  fetchReportVersions,
  type ReportVersionRecord,
} from "@/lib/report-versions";

export function ReportVersionHistory({
  sessionId,
}: {
  sessionId: string | null | undefined;
}) {
  const [versions, setVersions] = useState<ReportVersionRecord[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    void fetchReportVersions(sessionId).then(setVersions);
  }, [sessionId]);

  if (!sessionId || versions.length === 0) return null;

  return (
    <div className="glass-card p-4 mb-4">
      <p className="text-sm font-semibold text-primary mb-2">Export history</p>
      <ul className="text-xs text-secondary space-y-1.5 max-h-32 overflow-y-auto">
        {versions.map((v) => (
          <li key={v.id}>
            <span className="text-accent font-medium">v{v.version}</span>{" "}
            {new Date(v.createdAt).toLocaleString("en-PK", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {v.format.toUpperCase()}
            {v.note ? ` — ${v.note}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
