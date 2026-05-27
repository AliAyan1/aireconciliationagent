"use client";

import { useEffect, useState } from "react";
import { ShareDashboardClient } from "@/components/security/ShareDashboardClient";
import type { ShareSnapshot } from "@/lib/share-snapshot";
import { logActivity } from "@/lib/activity-log";

export function ShareViewLoader({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logActivity("page_view", `Opened shared reconciliation link`);
    void fetch(`/api/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Could not load share");
        }
        return res.json() as Promise<{
          snapshot: ShareSnapshot;
          expiresAt: string;
        }>;
      })
      .then((data) => {
        setSnapshot(data.snapshot);
        setExpiresAt(data.expiresAt);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-primary p-6">
        <p className="text-secondary">{error}</p>
      </div>
    );
  }

  if (!snapshot || !expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-primary">
        <p className="text-secondary text-sm">Loading shared results…</p>
      </div>
    );
  }

  return <ShareDashboardClient snapshot={snapshot} expiresAt={expiresAt} />;
}
