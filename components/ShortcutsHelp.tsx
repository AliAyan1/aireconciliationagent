"use client";

import { useState } from "react";

const SHORTCUTS = [
  { keys: "1 – 5", desc: "Switch dashboard tabs" },
  { keys: "A", desc: "Approve focused review item" },
  { keys: "R", desc: "Reject focused review item" },
  { keys: "E", desc: "Download CSV report" },
  { keys: "Esc", desc: "Close expanded table row" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-default bg-elevated text-secondary shadow-[var(--shadow-elevated)] hover:text-accent hover:border-active transition-all duration-200"
        aria-label="Keyboard shortcuts"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(5,10,18,0.6)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="card-surface w-full max-w-md p-6 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="shortcuts-title" className="text-lg font-semibold text-primary">
                Keyboard shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-primary"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-3">
              {SHORTCUTS.map((s) => (
                <li
                  key={s.keys}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <kbd className="rounded-md border border-default bg-input px-2 py-1 font-mono text-xs text-accent">
                    {s.keys}
                  </kbd>
                  <span className="text-secondary text-right">{s.desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Shortcuts work when not typing in a search field.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
