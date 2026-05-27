export interface ScheduledExportSettings {
  enabled: boolean;
  dayOfMonth: number;
  lastExportAt: string | null;
}

const KEY = "hisaab-scheduled-export";

export function loadScheduledExport(): ScheduledExportSettings {
  if (typeof window === "undefined") {
    return { enabled: false, dayOfMonth: 1, lastExportAt: null };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { enabled: false, dayOfMonth: 1, lastExportAt: null };
    return JSON.parse(raw) as ScheduledExportSettings;
  } catch {
    return { enabled: false, dayOfMonth: 1, lastExportAt: null };
  }
}

export function saveScheduledExport(settings: ScheduledExportSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function markScheduledExportDone() {
  const s = loadScheduledExport();
  if (!s.enabled) return;
  saveScheduledExport({ ...s, lastExportAt: new Date().toISOString() });
}

export function getScheduledExportReminder(): string | null {
  const s = loadScheduledExport();
  if (!s.enabled) return null;

  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), s.dayOfMonth);
  if (due < now) {
    due.setMonth(due.getMonth() + 1);
  }
  const daysUntil = Math.ceil(
    (due.getTime() - now.getTime()) / (86400000)
  );
  if (daysUntil > 3) return null;
  if (daysUntil <= 0) {
    return "Your scheduled monthly export is due today.";
  }
  return `Your scheduled export is due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`;
}
