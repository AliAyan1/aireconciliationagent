export const ONBOARDING_STORAGE_KEY = "hisaabai-onboarding-v1";

export type OnboardingStepIndex = 1 | 2 | 3 | 4 | 5;

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "done";
  } catch {
    return true;
  }
}

export function getOnboardingStep(): OnboardingStepIndex | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw || raw === "done") return null;
    const n = Number(raw);
    if (n >= 1 && n <= 4) return n as OnboardingStepIndex;
    return null;
  } catch {
    return null;
  }
}

export function startOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

export function setOnboardingStep(step: OnboardingStepIndex): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, String(step));
  } catch {
    // ignore
  }
}

export function completeOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
  } catch {
    // ignore
  }
}

/** First step to show on this page when the user has not finished the tour. */
export function getActiveStepForPage(
  page: "upload" | "dashboard"
): OnboardingStepIndex | null {
  if (isOnboardingComplete()) return null;

  const stored = getOnboardingStep();

  if (page === "upload") {
    if (stored === 1 || stored === null) return 1;
    return null;
  }

  // dashboard: steps 2-5 live here
  if (stored === 2 || stored === 3 || stored === 4 || stored === 5)
    return stored;
  if (stored === 1) return 2;
  if (stored === null) return 2;
  return null;
}
