export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-float">
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 blur-2xl animate-pulse-glow" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-xs text-slate-500">Reconciliation Dashboard</span>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4">
          {[
            { label: "Total", value: "26", color: "border-l-sky-400" },
            { label: "Matched", value: "18", color: "border-l-emerald-500" },
            { label: "Review", value: "5", color: "border-l-amber-500" },
            { label: "Unmatched", value: "3", color: "border-l-red-500" },
          ].map((card) => (
            <div
              key={card.label}
              className={`rounded-lg border border-slate-800 bg-slate-800/50 p-2 border-l-2 ${card.color}`}
            >
              <p className="text-lg font-bold text-slate-100">{card.value}</p>
              <p className="text-[10px] text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 px-4 py-2">
          <div className="flex gap-4 text-xs">
            <span className="text-sky-400 border-b border-sky-400 pb-1">Auto Matched</span>
            <span className="text-slate-500">Needs Review</span>
            <span className="text-slate-500">Unmatched</span>
          </div>
        </div>
        <div className="space-y-2 p-4 pt-2">
          {[
            { bank: "SALARY TRANSFER", ledger: "Employee Salary", amt: "PKR 250,000", conf: 99 },
            { bank: "M AHMED SERVICES", ledger: "Muhammad Ahmed Fee", amt: "PKR 15,000", conf: 87 },
            { bank: "CLIENT PAYMENT ABC", ledger: "Invoice ABC Corp", amt: "PKR 185,000", conf: 99 },
          ].map((row) => (
            <div
              key={row.bank}
              className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-300">{row.bank}</p>
                <p className="truncate text-slate-500">↔ {row.ledger}</p>
              </div>
              <div className="ml-2 text-right">
                <p className="font-medium text-slate-200">{row.amt}</p>
                <span
                  className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] ${
                    row.conf >= 90
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {row.conf}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
