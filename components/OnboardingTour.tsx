"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AUDIT_CERTIFICATE_SIGNER } from "@/lib/audit-certificate";
import {
  completeOnboarding,
  getActiveStepForPage,
  setOnboardingStep,
  type OnboardingStepIndex,
} from "@/lib/onboarding";

const STEPS: Record<
  OnboardingStepIndex,
  { target: string; title: string; body: string; page: "upload" | "dashboard"; step: string }
> = {
  1: {
    page: "upload",
    target: '[data-tour="upload"]',
    title: `Welcome to ${AUDIT_CERTIFICATE_SIGNER}!`,
    body: "Upload your files here — drop your bank statement CSV on the left and your internal ledger CSV on the right.",
    step: "1) Upload your files here",
  },
  2: {
    page: "dashboard",
    target: '[data-tour="start"]',
    title: "Click Start to reconcile",
    body: "After uploading, click 'Start Reconciliation'. HisaabAI will match transactions in seconds.",
    step: "2) Click Start",
  },
  3: {
    page: "dashboard",
    target: '[data-tour="stats"]',
    title: "Your results at a glance",
    body: "Review matches here — these cards show match rate, items needing review, and unmatched rows, updated live.",
    step: "3) Review matches here",
  },
  4: {
    page: "dashboard",
    target: '[data-tour="review"]',
    title: "Approve or reject",
    body: "Low-confidence matches land in the Review queue. Approve ✓ or Reject ✗ each pair — or use keyboard shortcuts A / R.",
    step: "4) Approve or reject",
  },
  5: {
    page: "dashboard",
    target: '[data-tour="export"]',
    title: "Export your report",
    body: "When you're done, export a PDF or CSV with a signed audit certificate to share with finance or auditors.",
    step: "5) Export your report",
  },
};

interface OnboardingTourProps {
  page: "upload" | "dashboard";
  onStepChange?: (step: OnboardingStepIndex) => void;
}

export function OnboardingTour({ page, onStepChange }: OnboardingTourProps) {
  const [step, setStep] = useState<OnboardingStepIndex | null>(() =>
    getActiveStepForPage(page)
  );
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
  } | null>(null);

  useEffect(() => {
    const active = getActiveStepForPage(page);
    if (active) onStepChange?.(active);
  }, [page, onStepChange]);

  const stepConfig = useMemo(() => (step ? STEPS[step] : null), [step]);

  const measureTarget = useCallback(() => {
    if (!stepConfig) return;
    const el = document.querySelector(stepConfig.target);
    if (!el) {
      setRect(null);
      return;
    }
    const pad = 10;
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
      bottom: r.bottom + pad,
    });
  }, [stepConfig]);

  useEffect(() => {
    if (!step) return;
    // Only subscribe; updates happen via browser events.
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [step, measureTarget]);

  if (!step || STEPS[step].page !== page) return null;

  const activeStep = step;
  const config = STEPS[activeStep];
  const isLast = activeStep === 5;

  function handleNext() {
    if (isLast) {
      completeOnboarding();
      setStep(null);
      return;
    }
    const next = (activeStep + 1) as OnboardingStepIndex;
    setOnboardingStep(next);
    setStep(next);
    onStepChange?.(next);
  }

  function handleSkip() {
    completeOnboarding();
    setStep(null);
  }

  const tooltipTop = rect
    ? Math.min(rect.bottom + 16, window.innerHeight - 200)
    : 120;
  const tooltipLeft = rect
    ? Math.max(16, Math.min(rect.left, window.innerWidth - 336))
    : 16;

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-[var(--accent)] transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(5, 10, 18, 0.72)",
          }}
          aria-hidden
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(5,10,18,0.72)]" aria-hidden />
      )}

      <div
        className="fixed z-[201] w-[min(320px,calc(100vw-2rem))] rounded-xl border border-default bg-elevated p-5 shadow-[var(--shadow-elevated)] animate-fade-up"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-accent mb-1">
          Step {activeStep} of 5
        </p>
        <h2 id="onboarding-title" className="text-base font-semibold text-primary">
          {config.title}
        </h2>
        <p className="mt-2 text-sm text-secondary leading-relaxed">{config.body}</p>
        {step === 1 && (
          <p className="mt-2 text-xs text-muted">
            After uploading, click Start Reconciliation — the tour continues on your dashboard.
          </p>
        )}
        <div className="mt-4 flex items-center gap-1.5 mb-3">
          {([1, 2, 3, 4, 5] as OnboardingStepIndex[]).map((s) => (
            <span
              key={s}
              className={`block h-1.5 rounded-full transition-all ${
                s === activeStep
                  ? "w-4 bg-[var(--accent)]"
                  : s < activeStep
                    ? "w-1.5 bg-[var(--accent)]/50"
                    : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary px-4 py-2 text-sm"
          >
            {isLast ? "Got it" : "Next →"}
          </button>
          {!isLast && (
            <button
              type="button"
              onClick={handleSkip}
              className="btn-ghost px-3 py-2 text-xs text-muted"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
