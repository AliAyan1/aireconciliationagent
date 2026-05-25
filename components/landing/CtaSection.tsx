import Link from "next/link";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-600/10 via-indigo-600/10 to-sky-600/10" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Your next reconciliation starts here
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
          Upload your bank statement and ledger CSVs. See matches in seconds.
          No credit card. No install.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/upload"
            className="rounded-xl bg-white px-10 py-4 text-lg font-semibold text-slate-950 shadow-lg transition hover:bg-slate-100"
          >
            Upload CSVs now
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-600 px-10 py-4 text-lg font-medium text-slate-300 hover:border-slate-500"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
