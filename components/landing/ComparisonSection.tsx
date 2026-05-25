const rows = [
  { metric: "Time per cycle", manual: "4–6 hours", ai: "< 30 min", win: true },
  { metric: "Match accuracy", manual: "92–95%", ai: "> 97%", win: true },
  { metric: "Missed matches", manual: "5–8%", ai: "< 3%", win: true },
  { metric: "Name variations", manual: "Manual lookup", ai: "Fuzzy + review", win: true },
  { metric: "Audit trail", manual: "None", ai: "Full CSV log", win: true },
];

export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Excel vs AI Reconciliation
        </h2>
        <p className="mt-4 text-slate-400">
          Same job. Fraction of the time. Fewer missed transactions.
        </p>
      </div>

      <div className="mt-12 overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
        <div className="grid grid-cols-3 bg-slate-900 text-sm font-medium">
          <div className="px-6 py-4 text-slate-400">Metric</div>
          <div className="border-l border-slate-800 px-6 py-4 text-slate-500">
            Manual Excel
          </div>
          <div className="border-l border-slate-800 bg-sky-500/5 px-6 py-4 text-sky-400">
            AI Engine
          </div>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.metric}
            className={`grid grid-cols-3 border-t border-slate-800 ${
              i % 2 === 0 ? "bg-slate-950" : "bg-slate-900/30"
            }`}
          >
            <div className="px-6 py-4 font-medium text-slate-200">
              {row.metric}
            </div>
            <div className="border-l border-slate-800 px-6 py-4 text-slate-500">
              {row.manual}
            </div>
            <div className="border-l border-slate-800 px-6 py-4 font-medium text-emerald-400">
              {row.ai}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
