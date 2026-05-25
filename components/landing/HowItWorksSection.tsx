import Link from "next/link";

const steps = [
  {
    num: "1",
    title: "Upload CSVs",
    desc: "Bank statement + internal ledger. Drag, drop, or load samples.",
    href: "/upload",
  },
  {
    num: "2",
    title: "Auto-match",
    desc: "Engine runs exact → near-date → fuzzy phases with confidence scores.",
    href: "/upload",
  },
  {
    num: "3",
    title: "Review queue",
    desc: "Approve or reject pairs below 90% confidence in a card UI.",
    href: "/dashboard",
  },
  {
    num: "4",
    title: "Export report",
    desc: "Download CSV with full audit trail for your records.",
    href: "/dashboard",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="border-y border-slate-800 bg-slate-900/40 py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-sky-400">
              Workflow
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">How it works</h2>
            <p className="mt-4 max-w-xl text-slate-400">
              From upload to export in four steps. No database, no account — your
              data stays in the browser session.
            </p>
          </div>
          <Link
            href="/upload"
            className="shrink-0 rounded-lg border border-sky-500/40 bg-sky-500/10 px-5 py-2.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
          >
            Try with sample data →
          </Link>
        </div>

        <div className="relative mt-16">
          <div className="absolute left-8 top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-sky-500/50 to-transparent lg:block" />
          <div className="grid gap-8 lg:grid-cols-2">
            {steps.map((step) => (
              <Link
                key={step.num}
                href={step.href}
                className="group relative flex gap-6 rounded-2xl border border-slate-800 bg-slate-950 p-6 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-sky-500/20">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 group-hover:text-sky-300 transition">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">{step.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
