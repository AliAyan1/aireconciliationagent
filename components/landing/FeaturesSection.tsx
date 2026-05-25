const features = [
  {
    icon: "⚡",
    title: "Exact matching",
    description:
      "Same amount, same date, same type — auto-approved at 99% confidence.",
    accent: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
  },
  {
    icon: "📅",
    title: "Near-date tolerance",
    description:
      "Catches payments posted 1–2 days apart between bank and ledger.",
    accent: "from-sky-500/20 to-sky-500/5 border-sky-500/30",
  },
  {
    icon: "🔍",
    title: "Fuzzy amount match",
    description:
      "±500 PKR tolerance flags likely pairs for your review queue.",
    accent: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  },
  {
    icon: "👤",
    title: "Human-in-the-loop",
    description:
      "Approve or reject uncertain matches before exporting the report.",
    accent: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30",
  },
  {
    icon: "💰",
    title: "PKR formatting",
    description:
      "Amounts display with thousand separators — built for Pakistani books.",
    accent: "from-sky-500/20 to-sky-500/5 border-sky-500/30",
  },
  {
    icon: "📥",
    title: "One-click export",
    description:
      "Download a reconciliation CSV with status, confidence, and match reasons.",
    accent: "from-violet-500/20 to-violet-500/5 border-violet-500/30",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-sky-400">
          Features
        </p>
        <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
          Everything finance teams need
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-400">
          Rule-based matching today. OpenAI fuzzy scoring for description
          similarity — coming in the next sprint.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className={`group rounded-2xl border bg-gradient-to-br p-6 transition hover:-translate-y-0.5 ${f.accent}`}
          >
            <span className="text-3xl">{f.icon}</span>
            <h3 className="mt-4 text-lg font-semibold text-slate-100">
              {f.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
