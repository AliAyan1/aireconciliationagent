"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { applyClientMeta } from "@/lib/client-meta";

interface SessionListItem {
  id: string;
  createdAt: string;
  name: string | null;
  status: string;
  bankFileName: string;
  ledgerFileName: string;
  matchRate: number;
  totalAutoMatched: number;
  totalNeedsReview: number;
  totalUnmatched: number;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyClientMeta({
      title: "History — Hisab.ai",
      description: "Browse past reconciliation sessions and reopen runs.",
    });
    fetch("/api/sessions")
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to load history");
        }
        return res.json();
      })
      .then((data: { sessions: SessionListItem[] }) => {
        setSessions(data.sessions);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-primary">
      <SiteHeader active="history" role="TEAM" />
      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">HisaabAI History</h1>
            <p className="mt-1 text-sm text-slate-500">
              Past sessions stored in PostgreSQL
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href="/compare" className="text-sky-400 hover:text-sky-300">
              Compare periods →
            </Link>
            <Link href="/upload" className="text-sky-400 hover:text-sky-300">
              New upload →
            </Link>
          </div>
        </div>

        {loading && (
          <p className="text-center text-slate-500 py-12">Loading sessions…</p>
        )}

        {error && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            {error}
            <span className="block mt-2 text-slate-500">
              Ensure DATABASE_URL is set in .env.local and migrations have been
              applied.
            </span>
          </p>
        )}

        {!loading && !error && sessions.length === 0 && (
          <p className="text-center text-slate-500 py-12">
            No sessions yet. Run a reconciliation to create one.
          </p>
        )}

        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/dashboard?session=${s.id}`}
                className="block rounded-lg border border-slate-800 bg-slate-900 px-5 py-4 hover:border-sky-500/50 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-100">
                      {s.name ??
                        `${s.bankFileName} + ${s.ledgerFileName}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(s.createdAt).toLocaleString()} · {s.status}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-emerald-400 font-medium">
                      {s.matchRate.toFixed(1)}% match rate
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {s.totalAutoMatched} auto · {s.totalNeedsReview} review ·{" "}
                      {s.totalUnmatched} unmatched
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
