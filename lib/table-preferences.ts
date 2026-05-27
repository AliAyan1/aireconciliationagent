export type SortDir = "asc" | "desc";

export type MatchTableSortKey =
  | "description"
  | "amount"
  | "date"
  | "confidence";

export interface MatchTableSort {
  key: MatchTableSortKey;
  dir: SortDir;
}

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  select: 44,
  index: 48,
  bankDesc: 200,
  amount: 110,
  ledgerDesc: 200,
  date: 100,
  confidence: 120,
  type: 100,
  status: 100,
  actions: 120,
};

const COL_KEY = "hisaab-match-table-columns";
const SORT_KEY = "hisaab-match-table-sort";
const PAGE_SIZE_KEY = "hisaab-match-table-page-size";
const WIDGET_LAYOUT_KEY = "hisaab-dashboard-widgets";
const WIDGET_LOCKED_KEY = "hisaab-dashboard-widgets-locked";

export function loadColumnWidths(): Record<string, number> {
  if (typeof window === "undefined") return { ...DEFAULT_COLUMN_WIDTHS };
  try {
    const raw = localStorage.getItem(COL_KEY);
    if (!raw) return { ...DEFAULT_COLUMN_WIDTHS };
    return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS };
  }
}

export function saveColumnWidths(widths: Record<string, number>) {
  localStorage.setItem(COL_KEY, JSON.stringify(widths));
}

export function resetColumnWidths() {
  localStorage.removeItem(COL_KEY);
}

export function loadTableSort(): MatchTableSort | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SORT_KEY);
    return raw ? (JSON.parse(raw) as MatchTableSort) : null;
  } catch {
    return null;
  }
}

export function saveTableSort(sort: MatchTableSort) {
  localStorage.setItem(SORT_KEY, JSON.stringify(sort));
}

export function loadPageSize(): number {
  if (typeof window === "undefined") return 50;
  const v = parseInt(localStorage.getItem(PAGE_SIZE_KEY) ?? "50", 10);
  return [25, 50, 100].includes(v) ? v : 50;
}

export function savePageSize(size: number) {
  localStorage.setItem(PAGE_SIZE_KEY, String(size));
}

export const DEFAULT_WIDGET_ORDER = [
  "total",
  "auto",
  "review",
  "posted",
  "unmatched",
] as const;

export type WidgetId = (typeof DEFAULT_WIDGET_ORDER)[number];

export function loadWidgetLayout(): WidgetId[] {
  if (typeof window === "undefined") return [...DEFAULT_WIDGET_ORDER];
  try {
    const raw = localStorage.getItem(WIDGET_LAYOUT_KEY);
    if (!raw) return [...DEFAULT_WIDGET_ORDER];
    const parsed = JSON.parse(raw) as WidgetId[];
    const valid = parsed.filter((id) =>
      DEFAULT_WIDGET_ORDER.includes(id as WidgetId)
    );
    return valid.length === DEFAULT_WIDGET_ORDER.length
      ? valid
      : [...DEFAULT_WIDGET_ORDER];
  } catch {
    return [...DEFAULT_WIDGET_ORDER];
  }
}

export function saveWidgetLayout(order: WidgetId[]) {
  localStorage.setItem(WIDGET_LAYOUT_KEY, JSON.stringify(order));
}

export function loadWidgetLocked(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(WIDGET_LOCKED_KEY) === "1";
}

export function saveWidgetLocked(locked: boolean) {
  localStorage.setItem(WIDGET_LOCKED_KEY, locked ? "1" : "0");
}
