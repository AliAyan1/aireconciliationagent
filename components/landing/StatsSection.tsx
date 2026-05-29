const stats = [
  { value: "< 30s", label: "Processing time", sub: "typical run on CSVs" },
  { value: "90–97%", label: "Match rate", sub: "with review workflow" },
  { value: "> 90%", label: "Auto-match confidence", sub: "no review needed" },
  { value: "100%", label: "Audit trail", sub: "every decision logged" },
];

export function StatsSection() {
  return (
    <section className="border-b border-slate-800 bg-slate-900/30">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-slate-800 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-950 px-6 py-10 text-center md:py-12"
          >
            <p className="text-3xl font-bold bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent md:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 font-medium text-slate-200">{stat.label}</p>
            <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
