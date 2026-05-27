export type DashboardTab =
  | "overview"
  | "auto"
  | "review"
  | "unmatched"
  | "entries"
  | "journal"
  | "evaluation"
  | "settings";

export const DASHBOARD_TAB_ORDER: DashboardTab[] = [
  "overview",
  "auto",
  "review",
  "unmatched",
  "entries",
  "journal",
  "evaluation",
  "settings",
];

export const DASHBOARD_NAV: {
  id: DashboardTab;
  label: string;
  icon: string;
  breadcrumb: string;
}[] = [
  { id: "overview", label: "Dashboard Overview", icon: "📊", breadcrumb: "Overview" },
  { id: "auto", label: "Auto Matched", icon: "✓", breadcrumb: "Auto Matched" },
  { id: "review", label: "Needs Review", icon: "👀", breadcrumb: "Needs Review" },
  { id: "unmatched", label: "Unmatched", icon: "⚠", breadcrumb: "Unmatched" },
  { id: "entries", label: "Post & Generate", icon: "📤", breadcrumb: "Post & Generate" },
  { id: "journal", label: "Journal", icon: "📒", breadcrumb: "Journal" },
  { id: "evaluation", label: "Evaluation", icon: "📈", breadcrumb: "Evaluation" },
  { id: "settings", label: "Settings", icon: "⚙", breadcrumb: "Settings" },
];

export function tabBreadcrumbLabel(tab: DashboardTab): string {
  return DASHBOARD_NAV.find((n) => n.id === tab)?.breadcrumb ?? "Dashboard";
}
