export type RetentionPolicy = "7" | "30" | "never";

const KEY = "hisaab-data-retention";

export function loadRetentionPolicy(): RetentionPolicy {
  if (typeof window === "undefined") return "30";
  const v = localStorage.getItem(KEY);
  if (v === "7" || v === "30" || v === "never") return v;
  return "30";
}

export function saveRetentionPolicy(policy: RetentionPolicy) {
  localStorage.setItem(KEY, policy);
}

export function retentionDays(policy: RetentionPolicy): number | null {
  if (policy === "never") return null;
  return Number(policy);
}

export function getRetentionWarning(reconciledAt: string | undefined): string | null {
  if (!reconciledAt) return null;
  const policy = loadRetentionPolicy();
  const days = retentionDays(policy);
  if (days == null) return null;

  const ageMs = Date.now() - new Date(reconciledAt).getTime();
  const ageDays = Math.floor(ageMs / 86400000);
  const remaining = days - ageDays;

  if (remaining > 7 || remaining < 0) return null;
  if (remaining === 0) {
    return `This session is ${ageDays} days old and will be deleted today per your retention policy.`;
  }
  return `This session is ${ageDays} days old and will be deleted in ${remaining} day${remaining === 1 ? "" : "s"}.`;
}
