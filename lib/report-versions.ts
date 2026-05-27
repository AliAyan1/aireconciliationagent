export interface ReportVersionRecord {
  id: string;
  version: number;
  format: string;
  note: string | null;
  createdAt: string;
  matchRate?: number;
}

export async function fetchReportVersions(
  sessionId: string
): Promise<ReportVersionRecord[]> {
  try {
    const res = await fetch(
      `/api/export-versions?sessionId=${encodeURIComponent(sessionId)}`
    );
    if (!res.ok) return loadLocalVersions(sessionId);
    const data = (await res.json()) as { versions?: ReportVersionRecord[] };
    return data.versions ?? [];
  } catch {
    return loadLocalVersions(sessionId);
  }
}

export async function recordReportExport(
  sessionId: string | null | undefined,
  format: string,
  note: string,
  meta?: { matchRate?: number }
): Promise<ReportVersionRecord | null> {
  if (sessionId) {
    try {
      const res = await fetch("/api/export-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, format, note, ...meta }),
      });
      if (res.ok) {
        const data = (await res.json()) as { version: ReportVersionRecord };
        return data.version;
      }
    } catch {
      // fallback
    }
  }
  return recordLocalVersion(sessionId ?? "local", format, note);
}

const LOCAL_KEY = "hisaab-export-versions";

function loadLocalVersions(sessionId: string): ReportVersionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(
      localStorage.getItem(LOCAL_KEY) ?? "{}"
    ) as Record<string, ReportVersionRecord[]>;
    return all[sessionId] ?? [];
  } catch {
    return [];
  }
}

function recordLocalVersion(
  sessionId: string,
  format: string,
  note: string
): ReportVersionRecord {
  const all = JSON.parse(
    localStorage.getItem(LOCAL_KEY) ?? "{}"
  ) as Record<string, ReportVersionRecord[]>;
  const list = all[sessionId] ?? [];
  const version: ReportVersionRecord = {
    id: `local-${Date.now()}`,
    version: list.length + 1,
    format,
    note,
    createdAt: new Date().toISOString(),
  };
  list.push(version);
  all[sessionId] = list.slice(-20);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  return version;
}
