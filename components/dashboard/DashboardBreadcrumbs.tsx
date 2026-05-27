import Link from "next/link";
import { tabBreadcrumbLabel, type DashboardTab } from "@/lib/dashboard-nav";

interface DashboardBreadcrumbsProps {
  activeTab: DashboardTab;
}

export function DashboardBreadcrumbs({ activeTab }: DashboardBreadcrumbsProps) {
  const current = tabBreadcrumbLabel(activeTab);

  return (
    <nav
      className="no-print mb-4 flex flex-wrap items-center gap-1.5 text-sm text-secondary"
      aria-label="Breadcrumb"
    >
      <Link href="/" className="hover:text-accent transition-colors">
        Home
      </Link>
      <span className="text-muted" aria-hidden>
        &gt;
      </span>
      <Link href="/upload" className="hover:text-accent transition-colors">
        Upload
      </Link>
      <span className="text-muted" aria-hidden>
        &gt;
      </span>
      <Link href="/dashboard" className="hover:text-accent transition-colors">
        Dashboard
      </Link>
      {activeTab !== "overview" && (
        <>
          <span className="text-muted" aria-hidden>
            &gt;
          </span>
          <span className="font-semibold text-primary" aria-current="page">
            {current}
          </span>
        </>
      )}
      {activeTab === "overview" && (
        <>
          <span className="text-muted" aria-hidden>
            &gt;
          </span>
          <span className="font-semibold text-primary" aria-current="page">
            Overview
          </span>
        </>
      )}
    </nav>
  );
}
