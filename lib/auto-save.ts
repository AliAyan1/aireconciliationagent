const INTERVAL_KEY = "hisaab-autosave-minutes";
const LAST_SAVED_KEY = "hisaab-last-autosave-at";

export function loadAutoSaveMinutes(): number {
  if (typeof window === "undefined") return 5;
  const v = Number(localStorage.getItem(INTERVAL_KEY));
  if (v === 0) return 0;
  return v >= 1 && v <= 60 ? v : 5;
}

export function saveAutoSaveMinutes(minutes: number) {
  localStorage.setItem(INTERVAL_KEY, String(minutes));
}

export function markAutoSaved() {
  localStorage.setItem(LAST_SAVED_KEY, new Date().toISOString());
}

export function getLastAutoSavedAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_SAVED_KEY);
}

export function formatLastSavedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Last saved just now";
  if (min === 1) return "Last saved 1 min ago";
  return `Last saved ${min} min ago`;
}
