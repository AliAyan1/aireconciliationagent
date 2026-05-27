"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { clearActivityLog, logActivity } from "@/lib/activity-log";
import { clearSession } from "@/lib/session";

export function DeleteMyDataPanel() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch("/api/user/delete-data", { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Delete failed");
      }
      clearSession();
      clearActivityLog();
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage).filter((k) =>
          k.startsWith("hisaab")
        );
        keys.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
      }
      logActivity("delete_data", "All reconciliation data deleted");
      toast.success("Your data has been permanently deleted");
      router.push("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete data");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section className="glass-card p-5 space-y-3 border border-red-500/20">
      <h3 className="text-sm font-semibold text-primary">Data controls (GDPR)</h3>
      <p className="text-xs text-secondary">
        Permanently remove all reconciliation sessions, matches, and journal
        entries stored for your workspace.
      </p>
      {!confirming ? (
        <button
          type="button"
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          onClick={() => setConfirming(true)}
        >
          Delete my data
        </button>
      ) : (
        <div className="space-y-3 rounded-lg bg-red-500/10 p-4">
          <p className="text-sm text-red-200">
            This will permanently delete all your reconciliation data. This
            cannot be undone.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500 disabled:opacity-50"
              onClick={() => void handleDelete()}
            >
              {busy ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="btn-ghost text-sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
