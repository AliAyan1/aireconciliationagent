"use client";

import { DASHBOARD_NAV, type DashboardTab } from "@/lib/dashboard-nav";

interface DashboardSidebarProps {
  active: DashboardTab;
  onNavigate: (tab: DashboardTab) => void;
  counts: Partial<Record<DashboardTab, number>>;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function DashboardSidebar({
  active,
  onNavigate,
  counts,
  collapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  return (
    <aside
      className={`no-print shrink-0 border-r border-default bg-card/80 backdrop-blur-sm transition-all duration-200 ${
        collapsed ? "w-[56px]" : "w-[220px]"
      }`}
      aria-label="Dashboard navigation"
    >
      <div className="sticky top-[57px] flex h-[calc(100vh-57px)] flex-col py-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mx-2 mb-2 rounded-lg border border-default px-2 py-1.5 text-xs text-muted hover:text-primary hover:border-hover"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {DASHBOARD_NAV.map((item) => {
            const isActive = active === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium transition-all ${
                  isActive
                    ? "border-l-[3px] border-l-[var(--accent)] bg-[rgba(56,189,248,0.1)] text-accent pl-2"
                    : "border-l-[3px] border-l-transparent text-secondary hover:bg-card-hover hover:text-primary"
                }`}
              >
                <span className="text-base shrink-0 w-5 text-center" aria-hidden>
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className="rounded-full bg-[rgba(56,189,248,0.15)] px-1.5 py-0.5 text-[10px] tabular-nums text-accent">
                        {count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
