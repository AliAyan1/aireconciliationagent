"use client";

import { useCallback, useEffect, useState } from "react";
import {
  extendSession,
  formatCountdown,
  getMsUntilExpiry,
  shouldShowExpiryWarning,
  touchSessionActivity,
} from "@/lib/session-inactivity";
import { logActivity } from "@/lib/activity-log";

export function SessionExpiryWarning() {
  const [visible, setVisible] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  const refresh = useCallback(() => {
    const warn = shouldShowExpiryWarning();
    setVisible(warn);
    if (warn) setRemainingMs(getMsUntilExpiry());
  }, []);

  useEffect(() => {
    touchSessionActivity();
    const onActivity = () => touchSessionActivity();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("scroll", onActivity, { passive: true });

    refresh();
    const id = window.setInterval(refresh, 1000);

    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
      clearInterval(id);
    };
  }, [refresh]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg glass-card border border-amber-500/50 p-4 shadow-lg sm:left-auto sm:right-6"
      role="alert"
    >
      <p className="text-sm font-medium text-primary">
        Your session will expire in{" "}
        <span className="text-amber-400 font-mono">
          {formatCountdown(remainingMs)}
        </span>
        . Save your work or export the report.
      </p>
      <button
        type="button"
        className="btn-primary mt-3 text-sm px-4 py-2"
        onClick={() => {
          extendSession(30);
          logActivity("session_extend", "Session extended by 30 minutes");
          setVisible(false);
        }}
      >
        Extend Session
      </button>
    </div>
  );
}
