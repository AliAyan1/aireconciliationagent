import { APP_REPORT_FILENAME_PREFIX } from "./branding";
import type { MatchResult } from "./types";

export async function downloadCsvReport(
  results: MatchResult[],
  sessionId?: string | null
): Promise<boolean> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      results: sessionId ? undefined : results,
      sessionId: sessionId ?? undefined,
    }),
  });

  if (!res.ok) return false;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${APP_REPORT_FILENAME_PREFIX}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
