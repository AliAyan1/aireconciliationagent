export interface PhaseThresholds {
  exact: number;
  near: number;
  fuzzy: number;
  ai: number;
}

export interface MatchingConfig {
  dateToleranceDays: number;
  amountTolerancePkr: number;
  autoApproveThreshold: number;
  phaseThresholds: PhaseThresholds;
  keywordBlacklist: string[];
  enableAiScoring: boolean;
  aiBatchSize: number;
}

export interface MatchingProfile {
  id: string;
  name: string;
  config: MatchingConfig;
}

export const DEFAULT_KEYWORD_BLACKLIST = [
  "PAYMENT",
  "TRANSFER",
  "ONLINE",
  "BANK",
  "TRF",
];

export const DEFAULT_PHASE_THRESHOLDS: PhaseThresholds = {
  exact: 95,
  near: 90,
  fuzzy: 85,
  ai: 90,
};

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  dateToleranceDays: 2,
  amountTolerancePkr: 500,
  autoApproveThreshold: 90,
  phaseThresholds: { ...DEFAULT_PHASE_THRESHOLDS },
  keywordBlacklist: [...DEFAULT_KEYWORD_BLACKLIST],
  enableAiScoring: true,
  aiBatchSize: 15,
};

export const BUILTIN_MATCHING_PROFILES: MatchingProfile[] = [
  {
    id: "hbl-strict",
    name: "HBL Bank — strict",
    config: {
      dateToleranceDays: 1,
      amountTolerancePkr: 100,
      autoApproveThreshold: 95,
      phaseThresholds: { exact: 98, near: 95, fuzzy: 90, ai: 92 },
      keywordBlacklist: [...DEFAULT_KEYWORD_BLACKLIST],
      enableAiScoring: true,
      aiBatchSize: 12,
    },
  },
  {
    id: "standard",
    name: "Standard — balanced",
    config: {
      dateToleranceDays: 2,
      amountTolerancePkr: 500,
      autoApproveThreshold: 90,
      phaseThresholds: { ...DEFAULT_PHASE_THRESHOLDS },
      keywordBlacklist: [...DEFAULT_KEYWORD_BLACKLIST],
      enableAiScoring: true,
      aiBatchSize: 15,
    },
  },
  {
    id: "flexible",
    name: "Flexible",
    config: {
      dateToleranceDays: 5,
      amountTolerancePkr: 2000,
      autoApproveThreshold: 85,
      phaseThresholds: { exact: 92, near: 88, fuzzy: 80, ai: 85 },
      keywordBlacklist: [...DEFAULT_KEYWORD_BLACKLIST],
      enableAiScoring: true,
      aiBatchSize: 20,
    },
  },
];

const CONFIG_KEY = "hisaab-matching-config";
const PROFILE_KEY = "hisaab-active-matching-profile";

export function loadMatchingConfig(): MatchingConfig {
  if (typeof window === "undefined") return { ...DEFAULT_MATCHING_CONFIG };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_MATCHING_CONFIG };
    const parsed = JSON.parse(raw) as Partial<MatchingConfig>;
    return {
      ...DEFAULT_MATCHING_CONFIG,
      ...parsed,
      phaseThresholds: {
        ...DEFAULT_PHASE_THRESHOLDS,
        ...parsed.phaseThresholds,
      },
      keywordBlacklist:
        parsed.keywordBlacklist?.length
          ? parsed.keywordBlacklist
          : [...DEFAULT_KEYWORD_BLACKLIST],
    };
  } catch {
    return { ...DEFAULT_MATCHING_CONFIG };
  }
}

export function saveMatchingConfig(config: MatchingConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROFILE_KEY);
}

export function saveActiveProfileId(id: string | null) {
  if (id) localStorage.setItem(PROFILE_KEY, id);
  else localStorage.removeItem(PROFILE_KEY);
}

export function applyMatchingProfile(profileId: string): MatchingConfig | null {
  const profile = BUILTIN_MATCHING_PROFILES.find((p) => p.id === profileId);
  if (!profile) return null;
  saveMatchingConfig(profile.config);
  saveActiveProfileId(profileId);
  return profile.config;
}

/** Server-safe merge for API requests */
export function mergeMatchingConfig(
  partial?: Partial<MatchingConfig> | null
): MatchingConfig {
  if (!partial) return { ...DEFAULT_MATCHING_CONFIG };
  return {
    ...DEFAULT_MATCHING_CONFIG,
    ...partial,
    phaseThresholds: {
      ...DEFAULT_PHASE_THRESHOLDS,
      ...partial.phaseThresholds,
    },
    keywordBlacklist:
      partial.keywordBlacklist?.length
        ? partial.keywordBlacklist
        : DEFAULT_MATCHING_CONFIG.keywordBlacklist,
  };
}

export function estimateAiCostPkr(
  candidateCount: number,
  batchSize: number
): { batches: number; estimatedUsd: number } {
  const batches = Math.max(1, Math.ceil(candidateCount / Math.max(1, batchSize)));
  const estimatedUsd = batches * 0.002;
  return { batches, estimatedUsd };
}
