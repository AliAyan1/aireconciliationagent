export function formatPKR(amount: number): string {
  const value = Math.abs(amount).toLocaleString("en-PK");
  return `PKR ${value}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
