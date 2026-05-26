export const DEMO_ACCOUNTS = {
  team: {
    label: "Team",
    email: "team@hisaabai.local",
    password: "team12345",
    redirectTo: "/upload",
  },
  admin: {
    label: "Admin",
    email: "admin@hisaabai.local",
    password: "admin12345",
    redirectTo: "/admin",
  },
} as const;

/** Legacy emails still accepted at login */
const EMAIL_ALIASES: Record<string, string> = {
  "team@airecon.local": DEMO_ACCOUNTS.team.email,
  "admin@airecon.local": DEMO_ACCOUNTS.admin.email,
};

export function normalizeLoginEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return EMAIL_ALIASES[normalized] ?? normalized;
}
