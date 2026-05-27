"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface DashboardFABProps {
  onExport: () => void;
  onRunEvaluation: () => void;
}

export function DashboardFAB({ onExport, onRunEvaluation }: DashboardFABProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="no-print fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="glass-card mb-1 min-w-[180px] overflow-hidden py-1 shadow-[var(--shadow-elevated)] animate-fade-up">
          <Link
            href="/upload"
            className="block px-4 py-3 text-sm text-primary hover:bg-card-hover"
            onClick={() => setOpen(false)}
          >
            New Upload
          </Link>
          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm text-primary hover:bg-card-hover"
            onClick={() => {
              setOpen(false);
              onExport();
            }}
          >
            Export Report
          </button>
          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm text-primary hover:bg-card-hover"
            onClick={() => {
              setOpen(false);
              onRunEvaluation();
            }}
          >
            Run Evaluation
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-2xl font-light text-white shadow-[var(--shadow-glow)] transition-transform hover:scale-105"
        aria-label={open ? "Close quick actions" : "Quick actions"}
        aria-expanded={open}
      >
        {open ? "×" : "+"}
      </button>
    </div>
  );
}
