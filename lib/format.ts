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
