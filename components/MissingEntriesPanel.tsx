"use client";

import type { MissingEntryProposal } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";

interface MissingEntriesPanelProps {
  proposals: MissingEntryProposal[];
  onGenerate: () => void;
  onPost: (proposalIds: string[]) => void;
  isGenerating: boolean;
  isPosting: boolean;
}

export function MissingEntriesPanel({
  proposals,
  onGenerate,
  onPost,
  isGenerating,
  isPosting,
}: MissingEntriesPanelProps) {
  const drafts = proposals.filter((p) => p.status === "draft");
  const posted = proposals.filter((p) => p.status === "posted");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div>
          <h3 className="font-semibold text-amber-300">Generate missing entries</h3>
          <p className="mt-1 text-sm text-slate-400">
            Create proposed ledger or bank lines for unmatched items so books can
            be balanced.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {isGenerating ? "Generating…" : "Generate proposals"}
        </button>
      </div>

      {drafts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-300">
              Draft proposals ({drafts.length})
            </h4>
            <button
              type="button"
              onClick={() => onPost(drafts.map((p) => p.id))}
              disabled={isPosting}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Post all drafts
            </button>
          </div>
          <ul className="space-y-3">
            {drafts.map((p) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onPost={() => onPost([p.id])}
                isPosting={isPosting}
              />
            ))}
          </ul>
        </div>
      )}

      {posted.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-emerald-400">
            Posted ({posted.length})
          </h4>
          <ul className="space-y-2">
            {posted.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-slate-400"
              >
                {p.narration} — posted
              </li>
            ))}
          </ul>
        </div>
      )}

      {proposals.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-6">
          Click &quot;Generate proposals&quot; to create missing ledger/bank entries
          from unmatched rows.
        </p>
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  onPost,
  isPosting,
}: {
  proposal: MissingEntryProposal;
  onPost: () => void;
  isPosting: boolean;
}) {
  if (proposal.source === "bank_only") {
    return (
      <li className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-400">
            Bank only
          </span>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
            → Generate ledger
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-lg bg-slate-800 p-3">
            <p className="text-xs text-slate-500">Bank</p>
            <p className="text-slate-200">{proposal.bankTransaction.description}</p>
            <p className="text-slate-400 mt-1">
              {formatDate(proposal.bankTransaction.date)} ·{" "}
              {formatPKR(proposal.bankTransaction.amount)}
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-3">
            <p className="text-xs text-emerald-400">Proposed ledger entry</p>
            <p className="text-slate-200">
              {proposal.proposedLedgerEntry.description}
            </p>
            <p className="text-slate-400 mt-1">
              {formatDate(proposal.proposedLedgerEntry.date)} ·{" "}
              {formatPKR(proposal.proposedLedgerEntry.amount)} · Inv{" "}
              {proposal.proposedLedgerEntry.invoiceNo}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{proposal.reason}</p>
        <button
          type="button"
          onClick={onPost}
          disabled={isPosting}
          className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Post entry
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-400">
          Ledger only
        </span>
        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
          → Generate bank
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div className="rounded-lg bg-slate-800 p-3">
          <p className="text-xs text-slate-500">Ledger</p>
          <p className="text-slate-200">{proposal.ledgerEntry.description}</p>
          <p className="text-slate-400 mt-1">
            {formatDate(proposal.ledgerEntry.date)} ·{" "}
            {formatPKR(proposal.ledgerEntry.amount)}
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-400">Proposed bank entry</p>
          <p className="text-slate-200">
            {proposal.proposedBankTransaction.description}
          </p>
          <p className="text-slate-400 mt-1">
            {formatDate(proposal.proposedBankTransaction.date)} ·{" "}
            {formatPKR(proposal.proposedBankTransaction.amount)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{proposal.reason}</p>
      <button
        type="button"
        onClick={onPost}
        disabled={isPosting}
        className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        Post entry
      </button>
    </li>
  );
}
