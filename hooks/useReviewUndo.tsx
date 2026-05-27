"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { MatchResult } from "@/lib/types";

export interface ReviewUndoEntry {
  id: string;
  previousStatus: MatchResult["status"];
  nextStatus: "approved" | "rejected";
  description: string;
}

const UNDO_TIMEOUT_MS = 5000;

interface UseReviewUndoOptions {
  onUpdate: (id: string, status: "approved" | "rejected") => void;
  onUndo: (id: string, previousStatus: MatchResult["status"]) => void;
}

export function useReviewUndo({ onUpdate, onUndo }: UseReviewUndoOptions) {
  const [history, setHistory] = useState<ReviewUndoEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef<string | null>(null);

  const clearPendingUndo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    timerRef.current = null;
    toastIdRef.current = null;
  }, []);

  const commitDecision = useCallback(
    (match: MatchResult, status: "approved" | "rejected") => {
      clearPendingUndo();

      const entry: ReviewUndoEntry = {
        id: match.id,
        previousStatus: match.status,
        nextStatus: status,
        description:
          match.bankTransaction?.description ??
          match.ledgerEntry?.description ??
          match.id,
      };

      onUpdate(match.id, status);
      setHistory((prev) => [...prev.slice(-19), entry]);

      const actionLabel = status === "approved" ? "approved" : "rejected";
      const short =
        entry.description.length > 30
          ? entry.description.slice(0, 30) + "…"
          : entry.description;

      const doUndo = (toastId: string) => {
        toast.dismiss(toastId);
        clearPendingUndo();
        onUndo(entry.id, entry.previousStatus);
        setHistory((prev) => prev.filter((e) => e.id !== entry.id));
      };

      const tid = toast.custom(
        (t) => (
          <UndoToastContent
            label={`Match ${actionLabel}`}
            detail={short}
            visible={t.visible}
            timeoutMs={UNDO_TIMEOUT_MS}
            onUndo={() => doUndo(t.id)}
          />
        ),
        { duration: UNDO_TIMEOUT_MS + 300 }
      );

      toastIdRef.current = tid;
      timerRef.current = setTimeout(() => {
        toastIdRef.current = null;
        timerRef.current = null;
      }, UNDO_TIMEOUT_MS);
    },
    [onUpdate, onUndo, clearPendingUndo]
  );

  // Ctrl+Z / Cmd+Z undoes the most recent decision
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "z" &&
        !e.shiftKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setHistory((prev) => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];
          clearPendingUndo();
          onUndo(last.id, last.previousStatus);
          return prev.slice(0, -1);
        });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onUndo, clearPendingUndo]);

  useEffect(() => () => clearPendingUndo(), [clearPendingUndo]);

  return { commitDecision, history };
}

function UndoToastContent({
  label,
  detail,
  visible,
  timeoutMs,
  onUndo,
}: {
  label: string;
  detail: string;
  visible: boolean;
  timeoutMs: number;
  onUndo: () => void;
}) {
  const [remaining, setRemaining] = useState(Math.ceil(timeoutMs / 1000));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-default bg-elevated px-4 py-3 text-sm shadow-elevated"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}
    >
      <span>
        <span className="font-medium">{label}.</span>{" "}
        <span className="text-muted text-xs">{detail}</span>
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="ml-1 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium hover:bg-white/10"
      >
        Undo ({remaining}s)
      </button>
    </div>
  );
}
