"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { logActivity } from "@/lib/activity-log";
import { buildShareUrl } from "@/lib/share-snapshot";
import type { SessionAuditMeta } from "@/lib/audit-certificate";
import type { MatchResult, ReconciliationSummary } from "@/lib/types";

interface ShareResultsButtonProps {
  results: MatchResult[];
  summary: ReconciliationSummary;
  sessionId?: string | null;
  auditMeta?: SessionAuditMeta;
}

export function ShareResultsButton({
  results,
  summary,
  sessionId,
  auditMeta,
}: ShareResultsButtonProps) {
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createLink() {
    setBusy(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId ?? undefined,
          results,
          summary,
          auditMeta,
        }),
      });
      if (!res.ok) throw new Error("Could not create share link");
      const data = (await res.json()) as {
        token: string;
        expiresAt: string;
      };
      const url = buildShareUrl(data.token);
      setLink(url);
      await navigator.clipboard.writeText(url);
      logActivity(
        "share",
        `Created read-only share link (expires ${new Date(data.expiresAt).toLocaleDateString()})`
      );
      toast.success("Share link copied — read-only, expires in 7 days");
    } catch {
      toast.error("Failed to create share link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        className="btn-ghost px-5 py-2.5 text-sm"
        disabled={busy}
        onClick={() => void createLink()}
      >
        {busy ? "Creating…" : "Share results"}
      </button>
      {link && (
        <p className="text-[10px] text-muted max-w-xs truncate" title={link}>
          {link}
        </p>
      )}
    </div>
  );
}
