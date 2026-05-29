"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import type { JournalPost, MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { isMatchAIScored } from "@/lib/ai-display";
import { isBankCharge } from "@/lib/transaction-categories";
import { sortMatchResults } from "@/lib/sort-matches";
import {
  DEFAULT_COLUMN_WIDTHS,
  loadColumnWidths,
  loadPageSize,
  loadTableSort,
  saveColumnWidths,
  savePageSize,
  saveTableSort,
  type MatchTableSort,
  type MatchTableSortKey,
} from "@/lib/table-preferences";
import { AnomalyFlagBadge } from "./AnomalyFlagBadge";
import {
  QuickFilterPills,
  type QuickFilterKey,
} from "./QuickFilterPills";
import { CategoryBadge } from "./ai/CategoryBadge";
import { ConfidenceBreakdown } from "./ai/ConfidenceBreakdown";
import { FraudAlertBadge } from "./ai/FraudAlertBadge";
import { RiskBadge } from "./ai/RiskBadge";
import { EmptyState } from "./EmptyState";
import { CopyTableButton } from "./export/CopyTableButton";
import { ExplainMatchButton } from "./ExplainMatchButton";
import { MatchTypeBadge } from "./MatchTypeBadge";
import { AmountWithHoverStat } from "./AmountWithHoverStat";
import { loadReviewDecisions } from "@/lib/review-feedback";

interface MatchTableProps {
  results: MatchResult[];
  journalPosts?: JournalPost[];
  expandedId?: string | null;
  onExpandedChange?: (id: string | null) => void;
  hideSearch?: boolean;
  anomalyMap?: Record<string, string>;
  fraudMap?: Record<string, string>;
  selectable?: boolean;
  onExportSelected?: (ids: string[]) => void;
  onBulkApprove?: (ids: string[]) => void;
  onBulkReject?: (ids: string[]) => void;
  tableResetKey?: number;
}

const SORTABLE: { key: MatchTableSortKey; label: string }[] = [
  { key: "description", label: "Bank Description" },
  { key: "amount", label: "Amount" },
  { key: "date", label: "Date" },
  { key: "confidence", label: "Confidence" },
];

function StatusPill({ status }: { status: MatchResult["status"] }) {
  if (status === "posted") {
    return (
      <span className="rounded-full bg-[rgba(139,92,246,0.2)] px-2.5 py-0.5 text-xs font-medium text-[var(--purple)]">
        Posted
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[rgba(16,185,129,0.2)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
      Auto Matched
    </span>
  );
}

function SortArrow({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="text-muted ml-1 opacity-40">↕</span>;
  return <span className="ml-1 text-accent">{dir === "asc" ? "↑" : "↓"}</span>;
}

export function MatchTable({
  results,
  journalPosts = [],
  expandedId: controlledExpanded,
  onExpandedChange,
  hideSearch = false,
  anomalyMap = {},
  fraudMap = {},
  selectable = true,
  onExportSelected,
  onBulkApprove,
  onBulkReject,
  tableResetKey = 0,
}: MatchTableProps) {
  const [localQuery, setLocalQuery] = useState("");
  const [localExpanded, setLocalExpanded] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<QuickFilterKey>>(
    new Set<QuickFilterKey>(["all"])
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState(() => loadColumnWidths());
  const [sort, setSort] = useState<MatchTableSort | null>(() => loadTableSort());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(() => loadPageSize());
  const resizeRef = useRef<{
    col: string;
    startX: number;
    startW: number;
  } | null>(null);

  const expandedId =
    controlledExpanded !== undefined ? controlledExpanded : localExpanded;
  const setExpandedId = onExpandedChange ?? setLocalExpanded;
  // Parent should bump tableResetKey to force a remount when needed.
  void tableResetKey;

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filtered = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    let list = results;
    if (!hideSearch && q) {
      list = list.filter((r) => {
        const bank = r.bankTransaction?.description.toLowerCase() ?? "";
        const ledger = r.ledgerEntry?.description.toLowerCase() ?? "";
        return bank.includes(q) || ledger.includes(q);
      });
    }
    if (!activeFilters.has("all")) {
      list = list.filter((r) => {
        return [...activeFilters].some((key) => {
          if (key === "high_confidence") return r.confidence >= 0.9;
          if (key === "needs_review") return r.status === "review";
          if (key === "large_amount") {
            const amt =
              r.bankTransaction?.amount ?? r.ledgerEntry?.amount ?? 0;
            return amt > 50000;
          }
          if (key === "today") {
            const d =
              r.bankTransaction?.date ?? r.ledgerEntry?.date ?? "";
            return d.startsWith(todayStr);
          }
          return false;
        });
      });
    }
    return sortMatchResults(list, sort);
  }, [results, localQuery, hideSearch, sort, activeFilters, todayStr]);

  const total = filtered.length;
  // Keep rendering bounded for very large datasets.
  const effectivePageSize = total > 100 ? Math.min(pageSize, 50) : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * effectivePageSize;
  const pageEnd = Math.min(pageStart + effectivePageSize, total);
  const paged = filtered.slice(pageStart, pageEnd);

  // Avoid syncing state in an effect; `safePage` clamps UI rendering.

  const allPageSelected =
    paged.length > 0 && paged.every((r) => selected.has(r.id));

  function toggleSort(key: MatchTableSortKey) {
    setSort((prev) => {
      const next: MatchTableSort =
        prev?.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: "asc" };
      saveTableSort(next);
      return next;
    });
    setPage(1);
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paged.forEach((r) => next.delete(r.id));
      } else {
        paged.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  const startResize = useCallback(
    (col: string, e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = {
        col,
        startX: e.clientX,
        startW: columnWidths[col] ?? DEFAULT_COLUMN_WIDTHS[col] ?? 100,
      };
      function onMove(ev: MouseEvent) {
        if (!resizeRef.current) return;
        const delta = ev.clientX - resizeRef.current.startX;
        const w = Math.max(48, resizeRef.current.startW + delta);
        setColumnWidths((prev) => {
          const next = { ...prev, [resizeRef.current!.col]: w };
          return next;
        });
      }
      function onUp() {
        if (resizeRef.current) {
          setColumnWidths((prev) => {
            saveColumnWidths(prev);
            return prev;
          });
        }
        resizeRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [columnWidths]
  );

  function changePageSize(size: number) {
    setPageSizeState(size);
    savePageSize(size);
    setPage(1);
  }

  const selectedIds = [...selected];
  const reviewHistory = useMemo(() => loadReviewDecisions(), []);

  const relatedJournalByMatchId = useMemo(() => {
    const map: Record<string, JournalPost[]> = {};
    for (const j of journalPosts) {
      (map[j.matchId] ??= []).push(j);
    }
    for (const k of Object.keys(map)) {
      map[k].sort(
        (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      );
    }
    return map;
  }, [journalPosts]);

  function renderObjectDetails(obj: Record<string, unknown> | null) {
    if (!obj) return <p className="text-sm text-muted">—</p>;
    const entries = Object.entries(obj);
    return (
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {entries.map(([k, v]) => (
          <Fragment key={k}>
            <dt className="text-muted truncate">{k}</dt>
            <dd className="text-secondary truncate" title={String(v ?? "")}>
              {v == null ? "—" : String(v)}
            </dd>
          </Fragment>
        ))}
      </dl>
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon="✓"
        title="No auto-matched transactions"
        message="Try adjusting the matching threshold or upload files with clearer descriptions."
      />
    );
  }

  const col = (key: string, extra?: string) => ({
    width: columnWidths[key] ?? DEFAULT_COLUMN_WIDTHS[key],
    className: extra,
  });

  return (
    <div className="space-y-4">
      {!hideSearch && (
        <input
          type="search"
          placeholder="Filter by description…"
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            setPage(1);
          }}
          className="input-field w-full max-w-md px-4 py-2.5 text-sm"
          aria-label="Filter matches by description"
        />
      )}

      <QuickFilterPills
        active={activeFilters}
        onChange={(next) => {
          setActiveFilters(next);
          setPage(1);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        {total > effectivePageSize ? (
          <p>
            Showing {pageStart + 1}–{pageEnd} of {total} transactions
          </p>
        ) : (
          <p>{total} transaction{total === 1 ? "" : "s"}</p>
        )}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            Per page
            <select
              value={effectivePageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
              className="input-field px-2 py-1 text-xs"
              disabled={total > 100}
              title={
                total > 100
                  ? "Large dataset: rendering is limited to 50 rows per page for performance."
                  : undefined
              }
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-xs"
            onClick={() => {
              setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS });
              saveColumnWidths(DEFAULT_COLUMN_WIDTHS);
            }}
          >
            Reset columns
          </button>
          <CopyTableButton results={paged} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-default -mx-4 sm:mx-0" style={{ overflowY: "visible" }}>
        <table className="w-full text-left text-sm table-fixed" style={{ minWidth: 900 }}>
          <thead className="sticky top-0 z-10 bg-elevated text-secondary text-xs uppercase tracking-wide shadow-[0_1px_0_0_var(--border-default)]">
            <tr>
              {selectable && (
                <th style={{ width: col("select").width }} className="px-2 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on page"
                  />
                </th>
              )}
              <th style={{ width: col("index").width }} className="relative px-4 py-3">
                #
                <span
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent/40"
                  onMouseDown={(e) => startResize("index", e)}
                />
              </th>
              {SORTABLE.map((s) => (
                <th
                  key={s.key}
                  style={{
                    width:
                      col(
                        s.key === "description"
                          ? "bankDesc"
                          : s.key === "amount"
                            ? "amount"
                            : s.key === "date"
                              ? "date"
                              : "confidence"
                      ).width,
                  }}
                  className="relative px-4 py-3 cursor-pointer select-none hover:text-primary"
                  onClick={() => toggleSort(s.key)}
                >
                  {s.label}
                  <SortArrow active={sort?.key === s.key} dir={sort?.dir ?? "asc"} />
                  <span
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent/40"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startResize(
                        s.key === "description"
                          ? "bankDesc"
                          : s.key === "amount"
                            ? "amount"
                            : s.key === "date"
                              ? "date"
                              : "confidence",
                        e
                      );
                    }}
                  />
                </th>
              ))}
              <th style={{ width: col("ledgerDesc").width }} className="relative px-4 py-3">
                Ledger
                <span
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent/40"
                  onMouseDown={(e) => startResize("ledgerDesc", e)}
                />
              </th>
              <th style={{ width: col("type").width }} className="px-4 py-3">
                Type
              </th>
              <th style={{ width: col("status").width }} className="px-4 py-3">
                Status
              </th>
              <th style={{ width: col("actions").width }} className="no-print px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r, idx) => {
              const aiScored = isMatchAIScored(r);
              const expanded = expandedId === r.id;
              const rowSelected = selected.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                    className={`cursor-pointer border-t border-default transition-colors duration-200 ${
                      rowSelected
                        ? "bg-[rgba(56,189,248,0.12)]"
                        : r.matchType === "ai_scored" || aiScored
                          ? "bg-[rgba(56,189,248,0.06)] hover:bg-card-hover"
                          : idx % 2 === 0
                            ? "bg-card hover:bg-card-hover"
                            : "bg-primary hover:bg-card-hover"
                    }`}
                  >
                    {selectable && (
                      <td
                        className="px-2 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={rowSelected}
                          onChange={() => toggleOne(r.id)}
                          aria-label={`Select row ${pageStart + idx + 1}`}
                        />
                      </td>
                    )}
                    <td className="sticky left-0 z-[1] bg-inherit px-4 py-3 text-muted tabular-nums">
                      {pageStart + idx + 1}
                    </td>
                    <td className="px-4 py-3 text-primary truncate">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {r.bankTransaction && isBankCharge(r.bankTransaction.description) && (
                          <span className="mr-1">🏦</span>
                        )}
                        {r.bankTransaction?.description && (
                          <CategoryBadge description={r.bankTransaction.description} />
                        )}
                      </div>
                      <span className="block truncate mt-0.5">
                        {r.bankTransaction?.description}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-primary font-medium">
                      {r.bankTransaction ? (
                        <AmountWithHoverStat
                          amount={r.bankTransaction.amount}
                          source="bank"
                          transactionId={r.bankTransaction.id}
                          type={r.bankTransaction.type}
                          className="justify-end"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {r.bankTransaction ? formatDate(r.bankTransaction.date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ConfidenceBreakdown match={r} showBar={false} />
                        <RiskBadge match={r} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-primary truncate">
                      {r.ledgerEntry?.description}
                    </td>
                    <td className="px-4 py-3">
                      <MatchTypeBadge matchType={r.matchType} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td
                      className="no-print px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {anomalyMap[r.id] && (
                          <AnomalyFlagBadge reason={anomalyMap[r.id]} />
                        )}
                        {fraudMap[r.id] && (
                          <FraudAlertBadge message={fraudMap[r.id]} />
                        )}
                        <ExplainMatchButton match={r} />
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-elevated">
                      <td
                        colSpan={selectable ? 10 : 9}
                        className="px-4 py-4"
                      >
                        <div className="grid gap-4 lg:grid-cols-3 text-sm">
                          <div className="rounded-lg bg-input p-4 border border-default lg:col-span-1">
                            <p className="text-xs text-muted mb-1">🏦 Bank details</p>
                            <p className="font-medium text-primary">
                              {r.bankTransaction?.description ?? "—"}
                            </p>
                            {r.bankTransaction && (
                              <p className="mt-1 text-xs text-secondary">
                                {formatDate(r.bankTransaction.date)} ·{" "}
                                <span
                                  className={`font-mono tabular-nums ${
                                    r.bankTransaction.amount < 0
                                      ? "text-[var(--danger)]"
                                      : "text-primary"
                                  }`}
                                >
                                  {formatPKR(r.bankTransaction.amount)}
                                </span>
                              </p>
                            )}
                            {renderObjectDetails(
                              (r.bankTransaction as unknown as Record<string, unknown>) ??
                                null
                            )}
                          </div>

                          <div className="rounded-lg bg-input p-4 border border-default lg:col-span-1">
                            <p className="text-xs text-muted mb-1">📒 Ledger details</p>
                            <p className="font-medium text-primary">
                              {r.ledgerEntry?.description ?? "—"}
                            </p>
                            {r.ledgerEntry && (
                              <p className="mt-1 text-xs text-secondary">
                                {formatDate(r.ledgerEntry.date)} ·{" "}
                                <span
                                  className={`font-mono tabular-nums ${
                                    r.ledgerEntry.amount < 0
                                      ? "text-[var(--danger)]"
                                      : "text-primary"
                                  }`}
                                >
                                  {formatPKR(r.ledgerEntry.amount)}
                                </span>
                              </p>
                            )}
                            {renderObjectDetails(
                              (r.ledgerEntry as unknown as Record<string, unknown>) ??
                                null
                            )}
                          </div>

                          <div className="rounded-lg bg-input p-4 border border-default lg:col-span-1 space-y-3">
                            <div>
                              <p className="text-xs text-muted mb-1">Match reasoning</p>
                              <p className="text-sm text-secondary leading-relaxed">
                                {r.matchReason || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted mb-1">Confidence</p>
                              <div className="flex items-center gap-2">
                                <ConfidenceBreakdown match={r} showBar />
                                <MatchTypeBadge matchType={r.matchType} />
                                <StatusPill status={r.status} />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted mb-1">Review history</p>
                              {reviewHistory.filter((d) => d.matchId === r.id).length ===
                              0 ? (
                                <p className="text-xs text-muted">No actions recorded.</p>
                              ) : (
                                <ul className="space-y-1 text-xs text-secondary">
                                  {reviewHistory
                                    .filter((d) => d.matchId === r.id)
                                    .slice()
                                    .sort((a, b) => b.timestamp - a.timestamp)
                                    .slice(0, 10)
                                    .map((d) => (
                                      <li key={`${d.matchId}-${d.timestamp}`}>
                                        {new Date(d.timestamp).toLocaleString(
                                          "en-PK"
                                        )}{" "}
                                        ·{" "}
                                        <span className="font-medium text-primary">
                                          {d.action}
                                        </span>
                                        {typeof d.dateOffsetDays === "number" ? (
                                          <span className="text-muted">
                                            {" "}
                                            · Δ{d.dateOffsetDays}d
                                          </span>
                                        ) : null}
                                      </li>
                                    ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted mb-1">Journal entries</p>
                              {(relatedJournalByMatchId[r.id]?.length ?? 0) === 0 ? (
                                <p className="text-xs text-muted">None.</p>
                              ) : (
                                <ul className="space-y-1 text-xs text-secondary">
                                  {relatedJournalByMatchId[r.id].slice(0, 5).map((j) => (
                                    <li key={j.id} className="leading-relaxed">
                                      <span className="text-muted">
                                        {new Date(j.postedAt).toLocaleString("en-PK")}
                                      </span>
                                      {" · "}
                                      <span className="text-primary">{j.narration}</span>
                                      {" · "}
                                      <span
                                        className={`font-mono tabular-nums ${
                                          j.amount < 0
                                            ? "text-[var(--danger)]"
                                            : "text-primary"
                                        }`}
                                      >
                                        {formatPKR(j.amount)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <nav
          className="flex flex-wrap items-center justify-center gap-1 text-sm"
          aria-label="Pagination"
        >
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost px-3 py-1 disabled:opacity-40"
          >
            ‹
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (safePage <= 4) {
              pageNum = i + 1;
            } else if (safePage >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = safePage - 3 + i;
            }
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                className={`min-w-[2rem] rounded-lg px-2 py-1 ${
                  pageNum === safePage
                    ? "bg-[rgba(56,189,248,0.15)] text-accent font-semibold"
                    : "text-secondary hover:bg-card-hover"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost px-3 py-1 disabled:opacity-40"
          >
            ›
          </button>
        </nav>
      )}

      {selectable && selected.size > 0 && (
        <div className="no-print fixed bottom-20 left-1/2 z-30 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl glass-card px-4 py-3 shadow-[var(--shadow-elevated)] sm:bottom-6">
          <span className="text-sm font-medium text-primary">
            {selected.size} selected
          </span>
          {onBulkApprove && (
            <button
              type="button"
              className="rounded-lg border border-[var(--success)] px-3 py-1.5 text-sm text-[var(--success)]"
              onClick={() => {
                onBulkApprove(selectedIds);
                setSelected(new Set());
              }}
            >
              Approve All
            </button>
          )}
          {onBulkReject && (
            <button
              type="button"
              className="rounded-lg border border-[var(--danger)] px-3 py-1.5 text-sm text-[var(--danger)]"
              onClick={() => {
                onBulkReject(selectedIds);
                setSelected(new Set());
              }}
            >
              Reject All
            </button>
          )}
          {onExportSelected && (
            <button
              type="button"
              className="btn-primary px-3 py-1.5 text-sm"
              onClick={() => onExportSelected(selectedIds)}
            >
              Export Selected
            </button>
          )}
        </div>
      )}
    </div>
  );
}
