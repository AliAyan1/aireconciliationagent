export type ActivityKind =
  | "page_view"
  | "upload"
  | "export"
  | "review"
  | "share"
  | "settings"
  | "delete_data"
  | "session_extend"
  | "other";

export interface ActivityEntry {
  id: string;
  at: string;
  kind: ActivityKind;
  detail: string;
}

const STORAGE_KEY = "hisaab-activity-log";
const MAX_ENTRIES = 100;

export function logActivity(kind: ActivityKind, detail: string) {
  if (typeof window === "undefined") return;
  const entry: ActivityEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    kind,
    detail,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: ActivityEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_ENTRIES))
    );
  } catch {
    // ignore quota
  }
}

export function loadActivityLog(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearActivityLog() {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
