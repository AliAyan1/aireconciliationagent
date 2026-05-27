"use client";

import { useEffect, useState } from "react";
import { formatLastSavedLabel, getLastAutoSavedAt } from "@/lib/auto-save";

export function AutoSaveIndicator() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () =>
      setLabel(formatLastSavedLabel(getLastAutoSavedAt()));
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!label) return null;

  return (
    <span className="text-xs text-muted tabular-nums" title="Auto-save status">
      {label}
    </span>
  );
}
