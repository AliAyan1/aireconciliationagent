import {
  getDisplayPreferences,
  type DateFormatId,
} from "./display-preferences";

const CURRENCY_LOCALE: Record<string, string> = {
  PKR: "en-PK",
  USD: "en-US",
  EUR: "de-DE",
  AED: "en-AE",
  SAR: "ar-SA",
  GBP: "en-GB",
};

export function formatMoney(amount: number): string {
  const { currency } = getDisplayPreferences();
  const locale = CURRENCY_LOCALE[currency] ?? "en-PK";
  const sign = amount < 0 ? "-" : "";
  const value = Math.abs(amount).toLocaleString(locale, {
    maximumFractionDigits: 2,
  });
  return `${sign}${currency} ${value}`;
}

/** @deprecated Use formatMoney — kept for compatibility */
export function formatPKR(amount: number): string {
  return formatMoney(amount);
}

function formatWithPattern(d: Date, fmt: DateFormatId): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const pad = (n: number) => String(n).padStart(2, "0");

  switch (fmt) {
    case "iso":
      return `${y}-${pad(m + 1)}-${pad(day)}`;
    case "dmy":
      return `${pad(day)}/${pad(m + 1)}/${y}`;
    case "mdy":
      return `${pad(m + 1)}/${pad(day)}/${y}`;
    case "dmon":
    default:
      return `${pad(day)}-${months[m]}-${y}`;
  }
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return formatWithPattern(d, getDisplayPreferences().dateFormat);
}

/** e.g. "Just now", "2 minutes ago", "1 hour ago" */
export function formatRelativeTime(
  dateInput: string | Date,
  now: Date = new Date()
): string {
  const date =
    typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) {
    return typeof dateInput === "string" ? dateInput : "";
  }

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Just now";

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "Just now";

  const min = Math.floor(sec / 60);
  if (min < 60) {
    return min === 1 ? "1 minute ago" : `${min} minutes ago`;
  }

  const hours = Math.floor(min / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  return formatDate(date.toISOString().slice(0, 10));
}
