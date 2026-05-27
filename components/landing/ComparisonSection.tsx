import { ScrollReveal } from "@/components/landing/ScrollReveal";

const rows = [
  { label: "Time per cycle", manual: "4–6 hours", ai: "< 30 seconds" },
  { label: "Accuracy", manual: "92–95%", ai: "97%+" },
  { label: "Audit trail", manual: "None", ai: "Complete" },
  { label: "Cost", manual: "Hours of salary", ai: "Pennies per run" },
];

export function ComparisonSection() {
  return (
    <section className="py-20 md:py-24 border-b border-default">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <ScrollReveal>
          <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-primary mb-10">
            Manual vs HisaabAI
          </h2>
        </ScrollReveal>
        <ScrollReveal>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-elevated text-secondary">
                  <th className="px-6 py-4 text-left font-medium w-1/3" />
                  <th className="px-6 py-4 text-left font-medium">Manual</th>
                  <th className="px-6 py-4 text-left font-medium bg-[rgba(16,185,129,0.06)] text-[var(--success)]">
                    HisaabAI
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-default">
                    <td className="px-6 py-4 text-secondary">{r.label}</td>
                    <td className="px-6 py-4 text-muted">{r.manual}</td>
                    <td className="px-6 py-4 bg-[rgba(16,185,129,0.04)] text-primary font-medium">
                      <span className="text-[var(--success)] mr-2">✓</span>
                      {r.ai}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
