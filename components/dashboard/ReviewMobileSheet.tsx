"use client";

import { useEffect, useState } from "react";

interface ReviewMobileSheetProps {
  open: boolean;
  bankLabel?: string;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function ReviewMobileSheet({
  open,
  bankLabel,
  onApprove,
  onReject,
  onClose,
}: ReviewMobileSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  if (!open) return null;

  function onTouchStart(e: React.TouchEvent) {
    setDragging(true);
    setStartY(e.touches[0].clientY);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) setDragY(dy);
  }

  function onTouchEnd() {
    setDragging(false);
    if (dragY > 80) onClose();
    setDragY(0);
  }

  return (
    <>
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-50 glass-card rounded-t-2xl border-t border-default px-4 pb-8 pt-3 shadow-[var(--shadow-elevated)]"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.25s ease-out",
        }}
        role="dialog"
        aria-label="Review actions"
      >
        <div
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-hover)]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          aria-hidden
        />
        {bankLabel && (
          <p className="mb-4 truncate text-sm text-secondary">{bankLabel}</p>
        )}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onApprove}
            className="w-full rounded-xl border-2 border-[var(--success)] py-4 text-base font-semibold text-[var(--success)] active:bg-[var(--success)] active:text-white"
          >
            ✓ Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            className="w-full rounded-xl border-2 border-[var(--danger)] py-4 text-base font-semibold text-[var(--danger)] active:bg-[var(--danger)] active:text-white"
          >
            ✗ Reject
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 text-sm text-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
