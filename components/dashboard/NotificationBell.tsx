"use client";

import { useEffect, useRef, useState } from "react";

export interface DashboardNotification {
  id: string;
  message: string;
  href?: string;
  onClick?: () => void;
}

interface NotificationBellProps {
  notifications: DashboardNotification[];
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = notifications.length;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-ghost relative flex h-9 w-9 items-center justify-center rounded-lg p-0"
        aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        aria-expanded={open}
      >
        <span className="text-lg" aria-hidden>
          🔔
        </span>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 glass-card overflow-hidden shadow-[var(--shadow-elevated)] animate-fade-up">
          <p className="border-b border-default px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Notifications
          </p>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted text-center">All caught up</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  {n.href ? (
                    <a
                      href={n.href}
                      className="block px-4 py-3 text-sm text-primary hover:bg-card-hover"
                      onClick={() => setOpen(false)}
                    >
                      {n.message}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="w-full px-4 py-3 text-left text-sm text-primary hover:bg-card-hover"
                      onClick={() => {
                        n.onClick?.();
                        setOpen(false);
                      }}
                    >
                      {n.message}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
