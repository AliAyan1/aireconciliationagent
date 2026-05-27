"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AchievementBadges } from "@/components/AchievementBadges";
import { AmountHoverProvider } from "@/components/AmountHoverProvider";
import { OnboardingTour } from "@/components/OnboardingTour";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import {
  DashboardAIQuery,
  type NLQueryState,
} from "@/components/DashboardAIQuery";
import { DashboardSearch } from "@/components/DashboardSearch";
import { ExportSection } from "@/components/ExportButton";
import { ReportVersionHistory } from "@/components/export/ReportVersionHistory";
import { RetentionWarningBanner } from "@/components/export/RetentionWarningBanner";
import { ScheduledExportBanner } from "@/components/export/ScheduledExportBanner";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { JournalLogPanel } from "@/components/JournalLogPanel";
import { MatchTable } from "@/components/MatchTable";
import { MissingEntriesPanel } from "@/components/MissingEntriesPanel";
import { PostEntriesPanel } from "@/components/PostEntriesPanel";
import { ReviewQueue } from "@/components/ReviewQueue";
import { SessionAnalyticsPanel } from "@/components/SessionAnalyticsPanel";
import {
  EvaluationDashboard,
  EvaluationSkeleton,
} from "@/components/EvaluationDashboard";
import type { EvaluationResult } from "@/lib/evaluator";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { SiteHeader } from "@/components/SiteHeader";
import { DashboardCharts } from "@/components/DashboardCharts";
import { DashboardTvMode } from "@/components/dashboard/DashboardTvMode";
import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs";
import { DashboardFAB } from "@/components/dashboard/DashboardFAB";
import { AutoSaveIndicator } from "@/components/dashboard/AutoSaveIndicator";
import { DashboardSettings } from "@/components/dashboard/DashboardSettings";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardWidgets } from "@/components/dashboard/DashboardWidgets";
import { PerfectReconciliationBadge } from "@/components/PerfectReconciliationBadge";
import type { DashboardNotification } from "@/components/dashboard/NotificationBell";
import {
  DASHBOARD_TAB_ORDER,
  type DashboardTab,
} from "@/lib/dashboard-nav";
import { AISummaryPanel } from "@/components/ai/AISummaryPanel";
import { ReviewFeedbackBanner } from "@/components/ai/ReviewFeedbackBanner";
import { SuggestedRulesBanner } from "@/components/ai/SuggestedRulesBanner";
import { TransactionClusterView } from "@/components/ai/TransactionClusterView";
import { UnmatchedList } from "@/components/UnmatchedList";
import { DragToMatchUnmatched } from "@/components/DragToMatchUnmatched";
import {
  detectFraudPatterns,
  fraudMapFromAlerts,
} from "@/lib/fraud-detection";
import { logActivity } from "@/lib/activity-log";
import { useReviewUndo } from "@/hooks/useReviewUndo";
import { saveReviewDecision } from "@/lib/review-feedback";
import { usePerfectMatchConfetti } from "@/hooks/usePerfectMatchConfetti";
import { isPerfectMatch } from "@/lib/perfect-match-confetti";
import {
  computeReviewProgress,
  loadReviewProgress,
  saveReviewProgress,
  type ReviewProgressState,
} from "@/lib/review-progress";
import { filterAIResults, isMatchAIScored } from "@/lib/ai-display";
import { downloadCsvReport } from "@/lib/client-export";
import { markAutoSaved, loadAutoSaveMinutes } from "@/lib/auto-save";
import { getSummary } from "@/lib/matcher";
import type { ReconciliationSummary } from "@/lib/types";
import { filterResultsByQuery } from "@/lib/search-matches";
import { APP_NAME, APP_REPORT_TITLE } from "@/lib/branding";
import { playApproveDing, playPostWhoosh } from "@/lib/ui-sounds";
import {
  loadSession,
  loadSessionId,
  saveSession,
  updateSession,
  type SessionData,
} from "@/lib/session";
import type { OnboardingStepIndex } from "@/lib/onboarding";
import type { MatchResult, MissingEntryProposal } from "@/lib/types";

type Tab = DashboardTab;

export interface DashboardClientProps {
  sessionParam: string | null;
}

export function DashboardClient({ sessionParam }: DashboardClientProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [tableResetKey, setTableResetKey] = useState(0);
  const [exportReady, setExportReady] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [proposals, setProposals] = useState<MissingEntryProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedReviewId, setFocusedReviewId] = useState<string | null>(null);
  const [restoredProgress, setRestoredProgress] =
    useState<ReviewProgressState | null>(null);
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
  const [anomalyMap, setAnomalyMap] = useState<Record<string, string>>({});
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);
  const [nlQuery, setNlQuery] = useState<NLQueryState | null>(null);
  const aiToastShown = useRef(false);
  const anomaliesFetchedFor = useRef<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const evalFetchedRef = useRef(false);

  const sessionId = session?.sessionId ?? sessionParam ?? loadSessionId();

  usePerfectMatchConfetti(session?.summary, sessionId, !loading && !!session);

  const runEvaluation = useCallback(async () => {
    if (!results.length) return;
    setEvalLoading(true);
    setEvalError(null);
    try {
      const rulesMs = session?.auditMeta?.rulesProcessingTimeMs ?? 0;
      const aiMs =
        session?.auditMeta?.aiProcessingTimeMs ??
        session?.aiMeta?.aiProcessingTimeMs ??
        0;
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results,
          totalProcessingMs: rulesMs + aiMs,
          aiProcessingMs: aiMs,
          sessionId: sessionId ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Evaluation failed");
      }
      const data = (await res.json()) as { evaluation: EvaluationResult };
      setEvaluation(data.evaluation);
    } catch (e) {
      setEvalError(
        e instanceof Error ? e.message : "Could not run evaluation"
      );
    } finally {
      setEvalLoading(false);
    }
  }, [results, session, sessionId]);

  const handleRerunEvaluation = useCallback(() => {
    setEvaluation(null);
    evalFetchedRef.current = false;
    void runEvaluation();
  }, [runEvaluation]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setSidebarCollapsed(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (tab !== "evaluation" || evaluation || evalLoading) return;
    if (evalFetchedRef.current) return;
    evalFetchedRef.current = true;
    void runEvaluation();
  }, [tab, evaluation, evalLoading, runEvaluation]);

  const hydrateFromApi = useCallback(async (id: string) => {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) return false;
    const data = await res.json();
    const next: SessionData = {
      sessionId: id,
      results: data.results,
      summary: data.summary,
      bankData: data.bankData,
      ledgerData: data.ledgerData,
      missingProposals: data.proposals ?? [],
      journalPosts: data.journalPosts ?? [],
      aiMeta: data.session?.aiScoringUsed
        ? {
            aiScoringUsed: true,
            aiCandidateCount:
              data.session.aiPairsScored ?? data.session.aiCandidateCount ?? 0,
            aiPairsScored: data.session.aiPairsScored ?? 0,
            aiProcessingTimeMs: data.session.aiProcessingTimeMs ?? 0,
          }
        : undefined,
      auditMeta: data.session
        ? {
            bankFileName: data.session.bankFileName ?? "bank_statement.csv",
            ledgerFileName: data.session.ledgerFileName ?? "ledger.csv",
            bankFileHash: "",
            ledgerFileHash: "",
            rulesProcessingTimeMs: data.session.rulesProcessingTimeMs ?? 0,
            aiProcessingTimeMs: data.session.aiProcessingTimeMs ?? 0,
            reconciledAt:
              data.session.createdAt ?? new Date().toISOString(),
          }
        : undefined,
    };
    setSession(next);
    setResults(next.results);
    setProposals(next.missingProposals);
    saveSession(next);
    return true;
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setSessionExpired(false);
      const id = sessionParam ?? loadSessionId();

      if (id) {
        const ok = await hydrateFromApi(id);
        if (ok) {
          setLoading(false);
          return;
        }
        const cached = loadSession();
        if (!cached?.results?.length) {
          setSessionExpired(true);
          setSession(null);
          setLoading(false);
          return;
        }
      }

      const data = loadSession();
      setSession(data);
      if (data) {
        setResults(data.results);
        setProposals(data.missingProposals ?? []);
      }
      setLoading(false);
    }
    void load();
  }, [sessionParam, hydrateFromApi]);

  // Restore review focus + banner if the user refreshed mid-review.
  useEffect(() => {
    if (loading || !session) return;
    const saved = loadReviewProgress(sessionId);
    if (!saved) return;
    setRestoredProgress(saved);
    if (saved.focusedReviewId) setFocusedReviewId(saved.focusedReviewId);
  }, [loading, session, sessionId]);

  useEffect(() => {
    if (!loading && session) {
      logActivity("page_view", "Opened reconciliation dashboard");
    }
  }, [loading, session]);

  const persist = useCallback((next: Partial<SessionData>) => {
    if (!session) return;
    const merged = { ...session, ...next };
    setSession(merged);
    if (next.results) setResults(next.results);
    if (next.missingProposals) setProposals(next.missingProposals);
    updateSession(next);
  }, [session]);

  async function copySessionId() {
    if (!sessionId) return;
    await navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fraudMap = useMemo(() => {
    if (!results.length) return {};
    return fraudMapFromAlerts(detectFraudPatterns(results));
  }, [results]);

  const handleReviewUpdate = useCallback(
    async (id: string, status: "approved" | "rejected") => {
      if (!session) return;

      const match = results.find((r) => r.id === id);
      if (match?.bankTransaction && match.ledgerEntry) {
        const b = match.bankTransaction.date;
        const l = match.ledgerEntry.date;
        const offset = Math.round(
          Math.abs(new Date(b).getTime() - new Date(l).getTime()) / 86400000
        );
        saveReviewDecision({
          matchId: id,
          action: status,
          dateOffsetDays: offset,
        });
      } else {
        saveReviewDecision({ matchId: id, action: status });
      }

      if (sessionId) {
        try {
          const res = await fetch("/api/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              matchId: id,
              action: status === "approved" ? "approve" : "reject",
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error ?? "Review failed");
          }
          const data = await res.json();
          const updated = results.map((r) =>
            r.id === id ? { ...r, ...data.match } : r
          );
          const summary = getSummary(
            updated,
            session.bankData,
            session.ledgerData
          );
          persist({ results: updated, summary });
          if (status === "approved") playApproveDing();
          toast.success(
            status === "approved" ? "✓ Match approved" : "✗ Match rejected"
          );
          return;
        } catch {
          // fall through
        }
      }

      const updated = results.map((r) =>
        r.id === id ? { ...r, status } : r
      );
      const summary = getSummary(updated, session.bankData, session.ledgerData);
      persist({ results: updated, summary });
      if (status === "approved") playApproveDing();
      const progress = computeReviewProgress(updated);
      saveReviewProgress(sessionId, {
        focusedReviewId,
        reviewedCount: progress.reviewedCount,
        totalToReview: progress.totalToReview,
      });
    },
    [session, sessionId, results, persist, focusedReviewId]
  );

  /** Revert a single match to its previous status (undo support — local only). */
  const handleUndoReview = useCallback(
    (id: string, previousStatus: MatchResult["status"]) => {
      if (!session) return;
      const updated = results.map((r) =>
        r.id === id ? { ...r, status: previousStatus } : r
      );
      const summary = getSummary(updated, session.bankData, session.ledgerData);
      persist({ results: updated, summary });
      toast.success("Undone");
      const progress = computeReviewProgress(updated);
      saveReviewProgress(sessionId, {
        focusedReviewId,
        reviewedCount: progress.reviewedCount,
        totalToReview: progress.totalToReview,
      });
    },
    [session, results, persist, sessionId, focusedReviewId]
  );

  const { commitDecision: commitReviewDecision } = useReviewUndo({
    onUpdate: (id, status) => void handleReviewUpdate(id, status),
    onUndo: handleUndoReview,
  });

  async function handleGenerateMissing() {
    if (!session) return;
    setIsGenerating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/generate-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId ?? undefined,
          results,
          bankData: session.bankData,
          ledgerData: session.ledgerData,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generate failed");
      }
      const data = await res.json();
      const nextProposals = data.proposals as MissingEntryProposal[];
      persist({
        missingProposals: nextProposals,
        summary: data.summary ?? session.summary,
      });
      toast.success(
        `✓ Generated ${nextProposals.length} missing entry proposal${nextProposals.length === 1 ? "" : "s"}`
      );
      setTab("entries");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePostEntries(matchIds: string[], proposalIds: string[]) {
    if (!session) return;
    setIsPosting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/post-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId ?? undefined,
          results,
          matchIds,
          proposalIds,
          proposals,
          bankData: session.bankData,
          ledgerData: session.ledgerData,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Post failed");
      }
      const data = await res.json();
      const postedCount = matchIds.length + proposalIds.length;
      persist({
        results: data.results,
        summary: data.summary,
        missingProposals: data.proposals,
        journalPosts: [
          ...(session.journalPosts ?? []),
          ...data.journalPosts,
        ],
      });
      playPostWhoosh();
      toast.success(
        `✓ ${postedCount} entr${postedCount === 1 ? "y" : "ies"} posted to journal`
      );
      if (sessionId) await hydrateFromApi(sessionId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Post failed");
    } finally {
      setIsPosting(false);
    }
  }

  const filteredResults = useMemo(() => {
    let base = filterResultsByQuery(results, searchQuery);
    if (nlQuery?.matchIds) {
      const ids = new Set(nlQuery.matchIds);
      base = base.filter((r) => ids.has(r.id));
    }
    return base;
  }, [results, searchQuery, nlQuery]);
  const searchTrimmed = searchQuery.trim();
  const searchResultCount = searchTrimmed
    ? filteredResults.length
    : results.length;

  const filteredJournalPosts = useMemo(() => {
    const posts = session?.journalPosts ?? [];
    if (!searchTrimmed) return posts;
    const q = searchTrimmed.toLowerCase();
    return posts.filter(
      (p) =>
        p.narration.toLowerCase().includes(q) ||
        p.bankReference.toLowerCase().includes(q) ||
        p.ledgerReference.toLowerCase().includes(q) ||
        p.invoiceNo.toLowerCase().includes(q) ||
        String(p.amount).includes(q)
    );
  }, [session?.journalPosts, searchTrimmed]);

  const reviewItemsForShortcuts = useMemo(
    () =>
      filteredResults.filter(
        (r) =>
          (r.status === "review" ||
            r.status === "approved" ||
            r.status === "rejected") &&
          r.bankTransaction &&
          r.ledgerEntry
      ),
    [filteredResults]
  );

  useEffect(() => {
    if (loading || !session || aiToastShown.current) return;
    if (!session.aiMeta && session.results.length > 0) {
      toast("⚠ AI scoring not available", { duration: 4000 });
      aiToastShown.current = true;
    }
  }, [session, loading]);

  useEffect(() => {
    if (loading || results.length === 0) return;
    const key = sessionId ?? "local";
    if (anomaliesFetchedFor.current === key) return;
    anomaliesFetchedFor.current = key;

    let cancelled = false;
    setAnomaliesLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/ai/anomalies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          flags?: { matchId: string; reason: string }[];
        };
        if (cancelled || !data.flags?.length) return;
        const map: Record<string, string> = {};
        for (const f of data.flags) {
          map[f.matchId] = f.reason;
        }
        setAnomalyMap(map);
      } catch {
        // optional AI feature
      } finally {
        if (!cancelled) setAnomaliesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, results, sessionId]);

  const handleTourStep = useCallback((step: OnboardingStepIndex) => {
    if (step === 3) setTab("review");
  }, []);

  function handleNLQuery(state: NLQueryState | null) {
    setNlQuery(state);
    if (state?.tab) {
      setTab(state.tab);
    }
  }

  function handlePrintDashboard() {
    setPrintedAt(
      new Date().toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    );
    requestAnimationFrame(() => window.print());
  }

  function printSectionClass(active: boolean): string {
    return active
      ? "dashboard-print-section print-avoid-break"
      : "hidden dashboard-print-section print-avoid-break";
  }

  useEffect(() => {
    if (!session) return;
    const activeSession = session;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Escape") {
        setExpandedTableId(null);
        return;
      }

      if (e.key === "?") {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(
          "[data-dashboard-search]"
        );
        el?.focus();
        return;
      }

      const tabIndex = parseInt(e.key, 10);
      if (tabIndex >= 1 && tabIndex <= DASHBOARD_TAB_ORDER.length) {
        setTab(DASHBOARD_TAB_ORDER[tabIndex - 1]);
        return;
      }

      if (e.key === "e" || e.key === "E") {
        void downloadCsvReport({
          results,
          sessionId,
          audit: activeSession.auditMeta,
          bankData: activeSession.bankData,
          ledgerData: activeSession.ledgerData,
        }).then((ok) => {
          if (ok) toast.success("📥 Report downloaded");
          else toast.error("Export failed. Please try again.");
        });
        return;
      }

      if (tab !== "review") return;

      const pending = reviewItemsForShortcuts.filter((r) => r.status === "review");
      const targetId =
        focusedReviewId && pending.some((r) => r.id === focusedReviewId)
          ? focusedReviewId
          : pending[0]?.id;
      if (!targetId) return;

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        const match = results.find((r) => r.id === targetId);
        if (match) commitReviewDecision(match, "approved");
        else void handleReviewUpdate(targetId, "approved");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const match = results.find((r) => r.id === targetId);
        if (match) commitReviewDecision(match, "rejected");
        else void handleReviewUpdate(targetId, "rejected");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    session,
    tab,
    focusedReviewId,
    reviewItemsForShortcuts,
    results,
    sessionId,
    handleReviewUpdate,
  ]);

  useEffect(() => {
    if (!session || loading) return;
    const minutes = loadAutoSaveMinutes();
    if (minutes <= 0) return;
    const id = setInterval(() => {
      persist({ results, summary: session.summary });
      markAutoSaved();
    }, minutes * 60_000);
    return () => clearInterval(id);
  }, [session, results, loading, persist]);

  const handleRematchComplete = useCallback(
    (nextResults: MatchResult[], summary: ReconciliationSummary) => {
      persist({ results: nextResults, summary });
      setResults(nextResults);
    },
    [persist]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-primary">
        <SiteHeader active="dashboard" role="TEAM" />
        <DashboardSkeleton />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-primary">
        <SiteHeader active="dashboard" role="TEAM" />
        <div className="mx-auto max-w-lg px-4 py-32 text-center md:px-8">
          {sessionExpired ? (
            <>
              <p className="text-xl font-semibold text-primary">Session expired</p>
              <p className="mt-3 text-sm text-secondary">
                Your data wasn&apos;t saved to the database. Please re-upload
                your files.
              </p>
              <Link href="/upload" className="btn-primary mt-6 inline-block px-6 py-2.5 text-sm">
                Re-upload files
              </Link>
            </>
          ) : (
            <>
              <p className="text-lg text-secondary">No reconciliation data yet</p>
              <Link href="/upload" className="mt-4 inline-block text-accent hover:underline">
                Upload CSV or Excel files
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const activeSession = session;

  const autoMatched = filteredResults.filter(
    (r) => r.status === "auto_matched" || r.status === "posted"
  );
  const reviewItems = filteredResults.filter(
    (r) =>
      (r.status === "review" ||
        r.status === "approved" ||
        r.status === "rejected") &&
      r.bankTransaction &&
      r.ledgerEntry
  );
  const unmatched = filteredResults.filter((r) => r.status === "unmatched");
  const postableResults = filteredResults.filter(
    (r) =>
      (r.status === "auto_matched" || r.status === "approved") &&
      r.bankTransaction &&
      r.ledgerEntry
  );

  const draftProposals = proposals.filter((p) => p.status === "draft").length;
  const journalCount = activeSession.journalPosts?.length ?? 0;

  const aiResults = filterAIResults(results);
  const aiScoredCount = results.filter(
    (r) => r.matchType === "ai_scored" || isMatchAIScored(r)
  ).length;
  const aiMeta =
    activeSession.aiMeta ??
    (aiScoredCount > 0
      ? {
          aiScoringUsed: true,
          aiCandidateCount: aiResults.length,
          aiPairsScored: aiResults.length,
          aiProcessingTimeMs: 0,
        }
      : undefined);
  const showAIInsights = !!(
    aiMeta?.aiScoringUsed &&
    (aiMeta.aiPairsScored > 0 ||
      aiMeta.aiCandidateCount > 0 ||
      aiScoredCount > 0)
  );

  const pendingReviewCount = reviewItems.filter((r) => r.status === "review").length;

  const sidebarCounts: Partial<Record<Tab, number>> = {
    auto: autoMatched.length,
    review: pendingReviewCount,
    unmatched: unmatched.length,
    entries: draftProposals,
    journal: journalCount,
  };

  const notifications: DashboardNotification[] = [];
  if (pendingReviewCount > 0) {
    notifications.push({
      id: "review",
      message: `${pendingReviewCount} item${pendingReviewCount === 1 ? "" : "s"} need review`,
      onClick: () => setTab("review"),
    });
  }
  if (evaluation && tab !== "evaluation") {
    notifications.push({
      id: "eval-done",
      message: "Evaluation complete",
      onClick: () => setTab("evaluation"),
    });
  }
  if (exportReady) {
    notifications.push({
      id: "export",
      message: "Export ready",
      onClick: () => {
        void downloadCsvReport({
          results,
          sessionId,
          audit: activeSession.auditMeta,
          bankData: activeSession.bankData,
          ledgerData: activeSession.ledgerData,
        });
        setExportReady(false);
      },
    });
  }

  async function handleExportReport() {
    const ok = await downloadCsvReport({
      results,
      sessionId,
      audit: activeSession.auditMeta,
      bankData: activeSession.bankData,
      ledgerData: activeSession.ledgerData,
    });
    if (ok) {
      setExportReady(true);
      toast.success("📥 Report downloaded");
    } else {
      toast.error("Export failed. Please try again.");
    }
  }

  function handleExportSelected(ids: string[]) {
    const subset = results.filter((r) => ids.includes(r.id));
    void downloadCsvReport({
      results: subset,
      sessionId,
      audit: activeSession.auditMeta,
      bankData: activeSession.bankData,
      ledgerData: activeSession.ledgerData,
    }).then((ok) => {
      if (ok) toast.success(`Exported ${subset.length} rows`);
    });
  }

  const reportTimestamp =
    printedAt ??
    new Date().toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="min-h-screen bg-primary" id="dashboard-print-root">
      <SiteHeader
        active="dashboard"
        role="TEAM"
        notifications={notifications}
      />
      {restoredProgress && (
        <div className="mx-auto max-w-6xl px-4 pt-4 md:px-8">
          <div className="glass-card border-l-[3px] border-l-emerald-500/70 p-4 text-sm text-secondary">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                <span className="text-emerald-400 font-medium">Restored your progress</span>{" "}
                — {restoredProgress.reviewedCount} of {restoredProgress.totalToReview} items reviewed.
              </p>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setRestoredProgress(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex">
        <DashboardSidebar
          active={tab}
          onNavigate={setTab}
          counts={sidebarCounts}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <DashboardBreadcrumbs activeTab={tab} />
        <AmountHoverProvider
          bankData={activeSession.bankData}
          ledgerData={activeSession.ledgerData}
        >
        <header className="hidden print:block print-report-header">
          <h1>{APP_REPORT_TITLE}</h1>
          <p>
            <strong>{APP_NAME}</strong> — Bank &amp; ledger reconciliation
          </p>
          {sessionId && (
            <p>
              Session: <span className="font-mono">{sessionId}</span>
            </p>
          )}
          <p>
            {activeSession.summary.totalBankTxns} bank transactions ·{" "}
            {activeSession.summary.matchRate}% match rate ·{" "}
            {activeSession.summary.unmatched} unmatched · {activeSession.summary.needsReview}{" "}
            in review
          </p>
          <p>Printed: {reportTimestamp}</p>
        </header>

        <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {sessionId && (
              <div className="flex items-center gap-2 rounded-lg bg-card border border-default px-3 py-1.5 text-xs text-secondary">
                <span>
                  Session{" "}
                  <span className="text-primary font-mono">
                    {sessionId.slice(0, 12)}…
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void copySessionId()}
                  className="text-accent hover:text-[var(--accent-hover)]"
                  aria-label="Copy session ID"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={handlePrintDashboard}
              className="btn-ghost px-4 py-2 text-sm"
              aria-label="Print dashboard report"
            >
              Print Dashboard
            </button>
            <Link href="/history" className="text-secondary hover:text-accent transition-colors">
              History
            </Link>
            <Link href="/upload" className="text-accent hover:text-[var(--accent-hover)] transition-colors">
              ← New Upload
            </Link>
            <AutoSaveIndicator />
          </div>
        </div>

        {actionError && (
          <p className="no-print mb-4 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2 text-sm text-[var(--danger)]">
            {actionError}
          </p>
        )}

        {tab === "overview" && (
          <div className="no-print space-y-8">
            <ScheduledExportBanner />
            <RetentionWarningBanner
              reconciledAt={activeSession.auditMeta?.reconciledAt}
            />
            <ReportVersionHistory sessionId={sessionId} />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DashboardTvMode summary={activeSession.summary} results={results} />
            </div>
            <PerfectReconciliationBadge summary={activeSession.summary} />
            <DashboardWidgets
              summary={activeSession.summary}
              results={results}
              aiScoredCount={aiScoredCount}
              showAIStat={showAIInsights}
            />
            <AISummaryPanel results={results} summary={activeSession.summary} />
            <TransactionClusterView results={results} />
            <AchievementBadges
              context={{
                summary: activeSession.summary,
                results,
                bankData: activeSession.bankData,
                ledgerData: activeSession.ledgerData,
                auditMeta: activeSession.auditMeta,
                aiMeta,
              }}
            />
            <DashboardCharts
              results={results}
              bankData={activeSession.bankData}
              ledgerData={activeSession.ledgerData}
              summary={activeSession.summary}
            />
            <SessionAnalyticsPanel results={results} />
            <DashboardAIQuery
              results={results}
              onResult={handleNLQuery}
              disabled={loading}
            />
            {nlQuery && (
              <p className="rounded-lg border border-default bg-card px-4 py-2.5 text-sm text-primary">
                {nlQuery.message}
              </p>
            )}
            <DashboardSearch
              value={searchQuery}
              onChange={setSearchQuery}
              resultCount={searchResultCount}
              totalCount={results.length}
            />
            {showAIInsights && aiMeta && (
              <AIInsightsPanel
                aiPairsScored={aiMeta.aiPairsScored}
                aiCandidateCount={aiMeta.aiCandidateCount}
                aiProcessingTimeMs={aiMeta.aiProcessingTimeMs}
                aiResults={aiResults}
              />
            )}
            <div data-tour="export">
              <ExportSection
                results={results}
                summary={activeSession.summary}
                sessionId={sessionId}
                auditMeta={activeSession.auditMeta}
                bankData={activeSession.bankData}
                ledgerData={activeSession.ledgerData}
                journalPosts={activeSession.journalPosts ?? []}
              />
            </div>
          </div>
        )}

        {tab === "auto" && (
          <section className="no-print">
            <h2 className="mb-4 text-lg font-semibold text-primary">
              Auto matched ({autoMatched.length})
            </h2>
            {autoMatched.length > 0 ? (
              <MatchTable
                results={autoMatched}
                journalPosts={activeSession.journalPosts ?? []}
                expandedId={expandedTableId}
                onExpandedChange={setExpandedTableId}
                hideSearch
                anomalyMap={anomalyMap}
                fraudMap={fraudMap}
                onExportSelected={handleExportSelected}
                tableResetKey={tableResetKey}
              />
            ) : (
              <p className="text-sm text-secondary">No auto-matched transactions.</p>
            )}
          </section>
        )}

        {tab === "review" && (
          <section className="no-print" data-tour="review">
            <ReviewFeedbackBanner />
            <SuggestedRulesBanner />
            <h2 className="mb-4 text-lg font-semibold text-primary">
              Needs review ({reviewItems.length})
            </h2>
            {reviewItems.length > 0 ? (
              <ReviewQueue
                results={reviewItems}
                onUpdate={handleReviewUpdate}
                onCommit={commitReviewDecision}
                focusedId={focusedReviewId}
                onFocusChange={(id) => {
                  setFocusedReviewId(id);
                  const progress = computeReviewProgress(results);
                  saveReviewProgress(sessionId, {
                    focusedReviewId: id,
                    reviewedCount: progress.reviewedCount,
                    totalToReview: progress.totalToReview,
                  });
                }}
                anomalyMap={anomalyMap}
                fraudMap={fraudMap}
              />
            ) : (
              <p className="text-sm text-secondary">Nothing pending review.</p>
            )}
          </section>
        )}

        {tab === "unmatched" && (
          <section className="no-print">
            <h2 className="mb-4 text-lg font-semibold text-primary">
              Unmatched ({unmatched.length})
            </h2>
            <p className="mb-4 text-xs text-muted">
              Drag a <span className="text-accent font-medium">Bank</span> item onto a{" "}
              <span className="text-[var(--purple)] font-medium">Ledger</span> item to create a manual match.
            </p>
            <DragToMatchUnmatched
              results={unmatched}
              anomalyMap={anomalyMap}
              onManualMatch={(bankId, ledgerId) => {
                const bankResult = results.find(
                  (r) => r.bankTransaction?.id === bankId || r.id === bankId
                );
                const ledgerResult = results.find(
                  (r) => r.ledgerEntry?.id === ledgerId || r.id === ledgerId
                );
                if (!bankResult || !ledgerResult || !session) return;
                const manualId = `manual-${Date.now()}`;
                const merged: MatchResult = {
                  id: manualId,
                  bankTransaction: bankResult.bankTransaction,
                  ledgerEntry: ledgerResult.ledgerEntry,
                  confidence: 100,
                  status: "approved",
                  matchType: "manual",
                  matchReason: "Human-verified manual match",
                };
                const updated = results
                  .filter((r) => r.id !== bankResult.id && r.id !== ledgerResult.id)
                  .concat(merged);
                const summary = getSummary(updated, session.bankData, session.ledgerData);
                persist({ results: updated, summary });
                toast.success("Manual match created ✓");
              }}
            />
            <UnmatchedList results={unmatched} anomalyMap={anomalyMap} />
            <button
              type="button"
              onClick={() => void handleGenerateMissing()}
              disabled={isGenerating || unmatched.length === 0}
              className="mt-6 w-full rounded-lg border border-[rgba(245,158,11,0.4)] py-3 text-sm font-medium text-[var(--warning)] hover:bg-[rgba(245,158,11,0.12)] disabled:opacity-50"
            >
              {isGenerating ? "Generating…" : "Generate Missing Entries →"}
            </button>
          </section>
        )}

        {tab === "entries" && (
          <section className="no-print space-y-8">
            <PostEntriesPanel
              results={searchTrimmed ? filteredResults : results}
              journalPosts={activeSession.journalPosts ?? []}
              onPostAll={() =>
                void handlePostEntries(postableResults.map((r) => r.id), [])
              }
              onPostSelected={(ids) => void handlePostEntries(ids, [])}
              isPosting={isPosting}
            />
            <MissingEntriesPanel
              proposals={proposals}
              onGenerate={() => void handleGenerateMissing()}
              onPost={(ids) => void handlePostEntries([], ids)}
              isGenerating={isGenerating}
              isPosting={isPosting}
            />
          </section>
        )}

        {tab === "journal" && (
          <section className="no-print">
            <h2 className="mb-4 text-lg font-semibold text-primary">
              Journal log ({journalCount})
            </h2>
            <JournalLogPanel journalPosts={filteredJournalPosts} />
          </section>
        )}

        {tab === "evaluation" && (
          <section className="no-print evaluation-print-section">
            <h2 className="text-lg font-semibold text-primary mb-2">
              Matching evaluation
            </h2>
            {evalLoading && !evaluation && <EvaluationSkeleton />}
            {evalError && (
              <div className="glass-card p-4 border border-[rgba(239,68,68,0.3)]">
                <p className="text-sm text-[var(--danger)]">{evalError}</p>
                <button
                  type="button"
                  onClick={() => void handleRerunEvaluation()}
                  className="btn-ghost mt-3 text-sm"
                >
                  Retry
                </button>
              </div>
            )}
            {evaluation && (
              <EvaluationDashboard
                evaluation={evaluation}
                onRerun={handleRerunEvaluation}
                isRerunning={evalLoading}
              />
            )}
          </section>
        )}

        {tab === "settings" && (
          <section className="no-print">
            <DashboardSettings
              onResetTable={() => setTableResetKey((k) => k + 1)}
              results={results}
              bankData={activeSession.bankData}
              ledgerData={activeSession.ledgerData}
              onRematchComplete={handleRematchComplete}
            />
          </section>
        )}

        {/* Print: all sections */}
        <div className="hidden print:block mt-8 space-y-8">
          <section className={printSectionClass(true)}>
            <h2 className="print-section-heading">
              Auto matched ({autoMatched.length})
            </h2>
            {autoMatched.length > 0 && (
              <MatchTable
                results={autoMatched}
                journalPosts={activeSession.journalPosts ?? []}
                hideSearch
                selectable={false}
              />
            )}
          </section>
          <section className="print-break-before">
            <h2 className="print-section-heading">
              Needs review ({reviewItems.length})
            </h2>
            {reviewItems.length > 0 && (
              <ReviewQueue results={reviewItems} onUpdate={handleReviewUpdate} />
            )}
          </section>
          <section className="print-break-before">
            <h2 className="print-section-heading">Unmatched ({unmatched.length})</h2>
            <UnmatchedList results={unmatched} />
          </section>
          <section className="print-break-before">
            <h2 className="print-section-heading">Journal ({journalCount})</h2>
            <JournalLogPanel journalPosts={filteredJournalPosts} />
          </section>
        </div>

        <DashboardFAB
          onExport={() => void handleExportReport()}
          onRunEvaluation={() => {
            setTab("evaluation");
            if (!evaluation && !evalLoading) void runEvaluation();
          }}
        />
        </AmountHoverProvider>
        </main>
      </div>
      <OnboardingTour page="dashboard" onStepChange={handleTourStep} />
      <ShortcutsHelp />
    </div>
  );
}
