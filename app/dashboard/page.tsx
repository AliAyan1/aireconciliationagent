"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExportButton } from "@/components/ExportButton";
import { MatchTable } from "@/components/MatchTable";
import { MissingEntriesPanel } from "@/components/MissingEntriesPanel";
import { PostEntriesPanel } from "@/components/PostEntriesPanel";
import { ReviewQueue } from "@/components/ReviewQueue";
import { SiteHeader } from "@/components/SiteHeader";
import { StatsCards } from "@/components/StatsCards";
import { UnmatchedList } from "@/components/UnmatchedList";
import { getSummary } from "@/lib/matcher";
import {
  loadSession,
  updateSession,
  type SessionData,
} from "@/lib/session";
import type { MatchResult, MissingEntryProposal } from "@/lib/types";

type Tab = "auto" | "review" | "unmatched" | "entries";

export default function DashboardPage() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [tab, setTab] = useState<Tab>("auto");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [proposals, setProposals] = useState<MissingEntryProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const data = loadSession();
    setSession(data);
    if (data) {
      setResults(data.results);
      setProposals(data.missingProposals ?? []);
    }
  }, []);

  function persist(next: Partial<SessionData>) {
    if (!session) return;
    const merged = { ...session, ...next };
    setSession(merged);
    if (next.results) setResults(next.results);
    if (next.missingProposals) setProposals(next.missingProposals);
    updateSession(next);
  }

  function handleReviewUpdate(id: string, status: "approved" | "rejected") {
    if (!session) return;
    const updated = results.map((r) =>
      r.id === id ? { ...r, status } : r
    );
    const summary = getSummary(updated, session.bankData, session.ledgerData);
    persist({ results: updated, summary });
  }

  async function handleGenerateMissing() {
    if (!session) return;
    setIsGenerating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/generate-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      persist({
        missingProposals: data.proposals as MissingEntryProposal[],
        summary: data.summary ?? session.summary,
      });
      setTab("entries");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePostEntries(
    matchIds: string[],
    proposalIds: string[]
  ) {
    if (!session) return;
    setIsPosting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/post-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      persist({
        results: data.results,
        summary: data.summary,
        missingProposals: data.proposals,
        journalPosts: [
          ...(session.journalPosts ?? []),
          ...data.journalPosts,
        ],
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Post failed");
    } finally {
      setIsPosting(false);
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <SiteHeader active="dashboard" />
        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
          <p className="text-lg">No data — go back to upload</p>
          <Link
            href="/upload"
            className="mt-4 text-sky-400 hover:text-sky-300 underline"
          >
            Upload CSVs
          </Link>
        </div>
      </div>
    );
  }

  const autoMatched = results.filter(
    (r) => r.status === "auto_matched" || r.status === "posted"
  );
  const reviewItems = results.filter(
    (r) =>
      (r.status === "review" ||
        r.status === "approved" ||
        r.status === "rejected") &&
      r.bankTransaction &&
      r.ledgerEntry
  );
  const unmatched = results.filter((r) => r.status === "unmatched");
  const draftProposals = proposals.filter((p) => p.status === "draft").length;

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
      count: draftProposals + (session.journalPosts?.length ?? 0),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader active="dashboard" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reconciliation Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Review matches, post entries, and generate missing lines
            </p>
          </div>
          <Link href="/upload" className="text-sm text-sky-400 hover:text-sky-300">
            ← New upload
          </Link>
        </div>

        <StatsCards summary={session.summary} />

        {actionError && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {actionError}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.id
                  ? "border-sky-400 text-sky-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "auto" && <MatchTable results={autoMatched} />}
          {tab === "review" && (
            <ReviewQueue results={reviewItems} onUpdate={handleReviewUpdate} />
          )}
          {tab === "unmatched" && (
            <div className="space-y-8">
              <UnmatchedList results={unmatched} />
              <button
                type="button"
                onClick={() => void handleGenerateMissing()}
                disabled={isGenerating || unmatched.length === 0}
                className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 py-3 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {isGenerating
                  ? "Generating missing entries…"
                  : "Generate missing entries from unmatched rows →"}
              </button>
            </div>
          )}
          {tab === "entries" && (
            <div className="space-y-10">
              <PostEntriesPanel
                results={results}
                journalPosts={session.journalPosts ?? []}
                onPostAll={() =>
                  void handlePostEntries(
                    results
                      .filter(
                        (r) =>
                          (r.status === "auto_matched" ||
                            r.status === "approved") &&
                          r.bankTransaction &&
                          r.ledgerEntry
                      )
                      .map((r) => r.id),
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
        </div>

        <div className="mt-10 flex justify-center border-t border-slate-800 pt-8">
          <ExportButton results={results} />
        </div>
      </main>
    </div>
  );
}
