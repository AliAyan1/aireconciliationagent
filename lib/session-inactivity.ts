/** Total idle time before session is considered expired (30 minutes). */
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

/** Show warning this many ms before expiry (5 minutes). */
export const SESSION_WARNING_BEFORE_MS = 5 * 60 * 1000;

const LAST_ACTIVITY_KEY = "hisaab-last-activity";
const EXTENDED_UNTIL_KEY = "hisaab-session-extended-until";

export function touchSessionActivity() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function extendSession(minutes = 30) {
  const until = Date.now() + minutes * 60 * 1000;
  localStorage.setItem(EXTENDED_UNTIL_KEY, String(until));
  touchSessionActivity();
  return until;
}

export function getLastActivityAt(): number {
  if (typeof window === "undefined") return Date.now();
  const ext = Number(localStorage.getItem(EXTENDED_UNTIL_KEY) || 0);
  if (ext > Date.now()) return Date.now();
  return Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
}

export function getMsUntilExpiry(): number {
  const last = getLastActivityAt();
  const expiresAt = last + SESSION_INACTIVITY_MS;
  return Math.max(0, expiresAt - Date.now());
}

export function shouldShowExpiryWarning(): boolean {
  const remaining = getMsUntilExpiry();
  return remaining > 0 && remaining <= SESSION_WARNING_BEFORE_MS;
}

export function isSessionIdleExpired(): boolean {
  return getMsUntilExpiry() === 0;
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}
