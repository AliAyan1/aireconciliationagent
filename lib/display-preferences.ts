export type CurrencyCode = "PKR" | "USD" | "EUR" | "AED" | "SAR" | "GBP";

export type DateFormatId = "iso" | "dmy" | "mdy" | "dmon";

export interface DisplayPreferences {
  currency: CurrencyCode;
  dateFormat: DateFormatId;
  accentPreset: string;
}

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string }[] = [
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "GBP", label: "GBP — British Pound" },
];

export const DATE_FORMAT_OPTIONS: { id: DateFormatId; label: string }[] = [
  { id: "iso", label: "YYYY-MM-DD" },
  { id: "dmy", label: "DD/MM/YYYY" },
  { id: "mdy", label: "MM/DD/YYYY" },
  { id: "dmon", label: "DD-Mon-YYYY" },
];

export const ACCENT_PRESETS: Record<
  string,
  { label: string; accent: string; hover: string; gradient: string }
> = {
  sky: {
    label: "Sky blue",
    accent: "#38bdf8",
    hover: "#7dd3fc",
    gradient: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
  },
  emerald: {
    label: "Emerald",
    accent: "#34d399",
    hover: "#6ee7b7",
    gradient: "linear-gradient(135deg, #34d399 0%, #14b8a6 100%)",
  },
  purple: {
    label: "Purple",
    accent: "#a78bfa",
    hover: "#c4b5fd",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)",
  },
  amber: {
    label: "Amber",
    accent: "#fbbf24",
    hover: "#fcd34d",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
  },
  rose: {
    label: "Rose",
    accent: "#fb7185",
    hover: "#fda4af",
    gradient: "linear-gradient(135deg, #fb7185 0%, #f472b6 100%)",
  },
};

const DISPLAY_KEY = "hisaab-display-preferences";
const SESSION_CURRENCY_KEY = "hisaab-session-currency";

const DEFAULT_DISPLAY: DisplayPreferences = {
  currency: "PKR",
  dateFormat: "dmon",
  accentPreset: "sky",
};

let cache: DisplayPreferences = { ...DEFAULT_DISPLAY };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getDisplayPreferences(): DisplayPreferences {
  return cache;
}

export function subscribeDisplayPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadDisplayPreferences(): DisplayPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_DISPLAY };
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    const sessionCurrency = sessionStorage.getItem(
      SESSION_CURRENCY_KEY
    ) as CurrencyCode | null;
    const base = raw
      ? ({ ...DEFAULT_DISPLAY, ...JSON.parse(raw) } as DisplayPreferences)
      : { ...DEFAULT_DISPLAY };
    if (sessionCurrency) base.currency = sessionCurrency;
    cache = base;
    return base;
  } catch {
    cache = { ...DEFAULT_DISPLAY };
    return cache;
  }
}

export function saveDisplayPreferences(partial: Partial<DisplayPreferences>) {
  const next = { ...cache, ...partial };
  cache = next;
  localStorage.setItem(DISPLAY_KEY, JSON.stringify(next));
  if (partial.currency) {
    sessionStorage.setItem(SESSION_CURRENCY_KEY, partial.currency);
  }
  applyAccentPreset(next.accentPreset);
  notify();
}

export function applyAccentPreset(presetId: string) {
  if (typeof document === "undefined") return;
  const preset = ACCENT_PRESETS[presetId] ?? ACCENT_PRESETS.sky;
  const root = document.documentElement;
  root.style.setProperty("--accent", preset.accent);
  root.style.setProperty("--accent-hover", preset.hover);
  root.style.setProperty("--accent-gradient", preset.gradient);
  root.dataset.accent = presetId;
}

export function initDisplayPreferences() {
  const prefs = loadDisplayPreferences();
  applyAccentPreset(prefs.accentPreset);
}
