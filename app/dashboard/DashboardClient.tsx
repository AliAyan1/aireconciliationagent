"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { DashboardSearch } from "@/components/DashboardSearch";
import { ExportSection } from "@/components/ExportButton";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { JournalLogPanel } from "@/components/JournalLogPanel";
import { MatchTable } from "@/components/MatchTable";
import { MissingEntriesPanel } from "@/components/MissingEntriesPanel";
import { PostEntriesPanel } from "@/components/PostEntriesPanel";
import { ReviewQueue } from "@/components/ReviewQueue";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { SiteHeader } from "@/components/SiteHeader";
import { DashboardCharts } from "@/components/DashboardCharts";
import { StatsCards } from "@/components/StatsCards";
import { UnmatchedList } from "@/components/UnmatchedList";
import { usePerfectMatchConfetti } from "@/hooks/usePerfectMatchConfetti";
import { filterAIResults, isMatchAIScored } from "@/lib/ai-display";
import { downloadCsvReport } from "@/lib/client-export";
import { getSummary } from "@/lib/matcher";
import { filterResultsByQuery } from "@/lib/search-matches";
import {
  loadSession,
  loadSessionId,
  saveSession,
  updateSession,
  type SessionData,
} from "@/lib/session";
import type { MatchResult, MissingEntryProposal } from "@/lib/types";

type Tab = "auto" | "review" | "unmatched" | "entries" | "journal";

const TAB_ORDER: Tab[] = ["auto", "review", "unmatched", "entries", "journal"];

export interface DashboardClientProps {
  sessionParam: string | null;
}

export function DashboardClient({ sessionParam }: DashboardClientProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("auto");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [proposals, setProposals] = useState<MissingEntryProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedReviewId, setFocusedReviewId] = useState<string | null>(null);
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
  const aiToastShown = useRef(false);

  const sessionId = session?.sessionId ?? sessionParam ?? loadSessionId();

  usePerfectMatchConfetti(session?.summary, sessionId, !loading && !!session);

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

  const handleReviewUpdate = useCallback(
    async (id: string, status: "approved" | "rejected") => {
      if (!session) return;

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
      toast.success(
        status === "approved" ? "✓ Match approved" : "✗ Match rejected"
      );
    },
    [session, sessionId, results, persist]
  );

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

  const filteredResults = useMemo(
    () => filterResultsByQuery(results, searchQuery),
    [results, searchQuery]
  );
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
    if (!session) return;

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

      const tabIndex = parseInt(e.key, 10);
      if (tabIndex >= 1 && tabIndex <= TAB_ORDER.length) {
        setTab(TAB_ORDER[tabIndex - 1]);
        return;
      }

      if (e.key === "e" || e.key === "E") {
        void downloadCsvReport(results, sessionId).then((ok) => {
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
        void handleReviewUpdate(targetId, "approved");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        void handleReviewUpdate(targetId, "rejected");
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
  const journalCount = session.journalPosts?.length ?? 0;

  const aiResults = filterAIResults(results);
  const aiScoredCount = results.filter(
    (r) => r.matchType === "ai_scored" || isMatchAIScored(r)
  ).length;
  const aiMeta =
    session.aiMeta ??
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

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "auto", label: "Auto Matched", count: autoMatched.length },
    {
      id: "review",
      label: "Needs Review",
      count: reviewItems.filter((r) => r.status === "review").length,
    },
    { id: "unmatched", label: "Unmatched", count: unmatched.length },
    {
      id: "entries",
      label: "Post & Generate",
      count: draftProposals,
    },
    { id: "journal", label: "Journal Log", count: journalCount },
  ];

  return (
    <div className="min-h-screen bg-primary">
      <SiteHeader active="dashboard" role="TEAM" />
      <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex gap-4 text-sm">
            <Link href="/history" className="text-secondary hover:text-accent transition-colors">
              History
            </Link>
            <Link href="/upload" className="text-accent hover:text-[var(--accent-hover)] transition-colors">
              ← New Upload
            </Link>
          </div>
        </div>

        <StatsCards
          summary={session.summary}
          aiScoredCount={aiScoredCount}
          showAIStat={showAIInsights}
        />

        <DashboardCharts results={results} />

        {showAIInsights && aiMeta && (
          <div className="mt-6">
            <AIInsightsPanel
              aiPairsScored={aiMeta.aiPairsScored}
              aiCandidateCount={aiMeta.aiCandidateCount}
              aiProcessingTimeMs={aiMeta.aiProcessingTimeMs}
              aiResults={aiResults}
            />
          </div>
        )}

        <div className="mt-6">
          <DashboardSearch
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={searchResultCount}
            totalCount={results.length}
          />
        </div>

        {actionError && (
          <p className="mt-4 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2 text-sm text-[var(--danger)]">
            {actionError}
          </p>
        )}

        <nav
          className="mt-8 flex flex-wrap gap-1 border-b border-default"
          aria-label="Dashboard tabs"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-3 text-sm font-medium transition-all duration-200 ${
                tab === t.id ? "text-accent tab-active" : "text-muted hover:text-secondary"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "auto" && (
            <MatchTable
              results={autoMatched}
              expandedId={expandedTableId}
              onExpandedChange={setExpandedTableId}
              hideSearch
            />
          )}
          {tab === "review" && (
            <ReviewQueue
              results={reviewItems}
              onUpdate={handleReviewUpdate}
              focusedId={focusedReviewId}
              onFocusChange={setFocusedReviewId}
            />
          )}
          {tab === "unmatched" && (
            <div className="space-y-6">
              <UnmatchedList results={unmatched} />
              <button
                type="button"
                onClick={() => void handleGenerateMissing()}
                disabled={isGenerating || unmatched.length === 0}
                className="w-full rounded-lg border border-[rgba(245,158,11,0.4)] py-3 text-sm font-medium text-[var(--warning)] transition-all duration-200 hover:bg-[rgba(245,158,11,0.12)] disabled:opacity-50"
                aria-label="Generate missing entries"
              >
                {isGenerating
                  ? "Generating missing entries…"
                  : "Generate Missing Entries →"}
              </button>
            </div>
          )}
          {tab === "entries" && (
            <div className="space-y-8">
              <PostEntriesPanel
                results={searchTrimmed ? filteredResults : results}
                journalPosts={session.journalPosts ?? []}
                onPostAll={() =>
                  void handlePostEntries(
                    postableResults.map((r) => r.id),
                    []
                  )
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
            </div>
          )}
          {tab === "journal" && (
            <JournalLogPanel journalPosts={filteredJournalPosts} />
          )}
        </div>

        <div className="mt-10">
          <ExportSection
            results={results}
            summary={session.summary}
            sessionId={sessionId}
          />
        </div>
      </main>
      <ShortcutsHelp />
    </div>
  );
}
