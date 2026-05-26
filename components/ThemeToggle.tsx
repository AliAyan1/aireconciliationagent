"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!mounted) {
    return (
      <span
        className="inline-block h-9 w-9 rounded-lg border border-default bg-card"
        aria-hidden
      />
    );
  }

  const isDark = (resolvedTheme ?? theme) !== "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="btn-ghost flex h-9 w-9 items-center justify-center rounded-lg p-0"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span
        className="inline-block text-lg transition-transform duration-300 ease-out"
        style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}
        aria-hidden
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
