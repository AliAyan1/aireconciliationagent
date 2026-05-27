export interface ReviewDecision {
  matchId: string;
  action: "approved" | "rejected";
  dateOffsetDays?: number;
  timestamp: number;
}

const STORAGE_KEY = "hisaab-review-feedback";

export function loadReviewDecisions(): ReviewDecision[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReviewDecision[]) : [];
  } catch {
    return [];
  }
}

export function saveReviewDecision(decision: Omit<ReviewDecision, "timestamp">) {
  const list = loadReviewDecisions();
  list.push({ ...decision, timestamp: Date.now() });
  const trimmed = list.slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export interface AdaptiveInsight {
  message: string;
  action?: "tighten_date" | "dismiss";
}

export function analyzeReviewPatterns(): AdaptiveInsight | null {
  const decisions = loadReviewDecisions();
  if (decisions.length < 10) return null;

  const rejects = decisions.filter((d) => d.action === "rejected");
  const withDate = rejects.filter((d) => d.dateOffsetDays != null && d.dateOffsetDays > 1);
  if (withDate.length >= 3 && withDate.length / rejects.length >= 0.5) {
    return {
      message:
        "Based on your reviews, you often reject matches where the date offset is more than 1 day. Want me to flag those for review automatically?",
      action: "tighten_date",
    };
  }

  const lowConfRejects = rejects.length;
  if (lowConfRejects >= 5 && rejects.length / decisions.length >= 0.4) {
    return {
      message:
        "You reject a high share of suggested matches. Consider tightening fuzzy matching or reviewing AI thresholds in Settings.",
    };
  }

  return null;
}

export function loadSuggestedRules(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("hisaab-suggested-rules");
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addSuggestedRule(rule: string) {
  const rules = loadSuggestedRules();
  if (!rules.includes(rule)) {
    rules.push(rule);
    localStorage.setItem("hisaab-suggested-rules", JSON.stringify(rules.slice(-10)));
  }
}

export function suggestRuleFromApprovals(): string | null {
  const decisions = loadReviewDecisions();
  const approved = decisions.filter((d) => d.action === "approved");
  if (approved.length < 5) return null;
  return "I noticed you often approve matches when descriptions share the same reference number. Want to add a Reference Number Match as Phase 1.5?";
}
