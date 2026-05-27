"use client";

import { useEffect, useState } from "react";
import {
  formatActivityTime,
  loadActivityLog,
  type ActivityEntry,
} from "@/lib/activity-log";

export function ActivityLogPanel() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    setEntries(loadActivityLog());
    const onStorage = () => setEntries(loadActivityLog());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <section className="glass-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-primary">Activity log</h3>
      <p className="text-xs text-muted">
        Recent actions on this device for debugging and accountability.
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-secondary">No activity recorded yet.</p>
      ) : (
        <ul className="max-h-64 overflow-y-auto space-y-2 text-xs text-secondary">
          {entries.map((e) => (
            <li key={e.id} className="border-b border-default/50 pb-2">
              <span className="text-muted">{formatActivityTime(e.at)}</span>
              <span className="mx-2 text-muted">·</span>
              {e.detail}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
