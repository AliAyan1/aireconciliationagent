export type ReportWatermark = "none" | "draft" | "final" | "confidential";

export interface ReportTemplate {
  id: string;
  name: string;
  includeMatched: boolean;
  includeUnmatched: boolean;
  includeJournal: boolean;
  includeEvaluation: boolean;
  minAmountPkr: number;
  maskSensitive: boolean;
}

export const DEFAULT_REPORT_TEMPLATE: ReportTemplate = {
  id: "default",
  name: "Full report",
  includeMatched: true,
  includeUnmatched: true,
  includeJournal: true,
  includeEvaluation: true,
  minAmountPkr: 0,
  maskSensitive: false,
};

const TEMPLATES_KEY = "hisaab-report-templates";
const ACTIVE_KEY = "hisaab-active-report-template";

export function loadReportTemplates(): ReportTemplate[] {
  if (typeof window === "undefined") return [DEFAULT_REPORT_TEMPLATE];
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const list = raw ? (JSON.parse(raw) as ReportTemplate[]) : [];
    return list.length ? list : [DEFAULT_REPORT_TEMPLATE];
  } catch {
    return [DEFAULT_REPORT_TEMPLATE];
  }
}

export function saveReportTemplates(templates: ReportTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates.slice(0, 10)));
}

export function loadActiveTemplate(): ReportTemplate {
  if (typeof window === "undefined") return DEFAULT_REPORT_TEMPLATE;
  try {
    const id = localStorage.getItem(ACTIVE_KEY);
    const templates = loadReportTemplates();
    return templates.find((t) => t.id === id) ?? templates[0] ?? DEFAULT_REPORT_TEMPLATE;
  } catch {
    return DEFAULT_REPORT_TEMPLATE;
  }
}

export function setActiveTemplateId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}
