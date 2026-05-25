import Link from "next/link";
import { DashboardPreview } from "./DashboardPreview";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-slate-800">
      <div className="landing-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-sky-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-20 right-0 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
            </span>
            AI-powered · PKR-ready · No signup
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
            Reconcile bank vs ledger in{" "}
            <span className="bg-gradient-to-r from-sky-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              minutes, not hours
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-slate-400">
            Upload two CSVs. Our engine matches transactions with exact, near-date,
            and fuzzy rules — then you review edge cases and export a full audit
            trail. Built for finance teams tired of Excel.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <Link
              href="/upload"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-sky-500/40 sm:w-auto"
            >
              Start Reconciliation
              <span className="transition group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="#how-it-works"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-8 py-4 text-center text-lg font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 sm:w-auto"
            >
              See how it works
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 lg:justify-start">
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> 90%+ faster
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Human review queue
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> CSV export
            </span>
          </div>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}
