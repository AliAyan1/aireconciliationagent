export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950">
        <div className="grid lg:grid-cols-2">
          <div className="border-b border-slate-800 p-10 lg:border-b-0 lg:border-r">
            <span className="text-4xl">😩</span>
            <h2 className="mt-4 text-2xl font-bold text-red-400/90">
              The old way
            </h2>
            <ul className="mt-6 space-y-4 text-slate-400">
              <li className="flex gap-3">
                <span className="text-red-400">×</span>
                4–6 hours in Excel every month-end
              </li>
              <li className="flex gap-3">
                <span className="text-red-400">×</span>
                &quot;M AHMED SVC&quot; vs &quot;Muhammad Ahmed Fee&quot; — manual guesswork
              </li>
              <li className="flex gap-3">
                <span className="text-red-400">×</span>
                Date offsets and partial payments slip through
              </li>
              <li className="flex gap-3">
                <span className="text-red-400">×</span>
                Zero audit trail when something breaks
              </li>
            </ul>
          </div>
          <div className="p-10">
            <span className="text-4xl">✨</span>
            <h2 className="mt-4 text-2xl font-bold text-emerald-400">
              With AI Reconciliation
            </h2>
            <ul className="mt-6 space-y-4 text-slate-300">
              <li className="flex gap-3">
                <span className="text-emerald-400">✓</span>
                Under 30 minutes end-to-end
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400">✓</span>
                Structured match reasons on every row
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400">✓</span>
                Review queue for anything below 90%
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400">✓</span>
                Exportable report for compliance
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
