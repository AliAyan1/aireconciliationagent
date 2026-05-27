import { ScrollReveal } from "@/components/landing/ScrollReveal";

const pains = [
  {
    icon: "⏱",
    title: "Hours of manual work",
    desc: "Finance teams spend 4–6 hours matching transactions line by line",
  },
  {
    icon: "❌",
    title: "Missed matches",
    desc: "5–8% of transactions are incorrectly paired or missed entirely",
  },
  {
    icon: "📋",
    title: "No audit trail",
    desc: "No record of who matched what, making compliance difficult",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 md:py-24 border-b border-default">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <ScrollReveal>
          <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-primary">
            The problem with manual reconciliation
          </h2>
        </ScrollReveal>
        <ScrollReveal className="mt-12" stagger>
          <div className="grid gap-6 md:grid-cols-3">
            {pains.map((p) => (
              <div
                key={p.title}
                className="scroll-reveal-item glass-card p-6 hover:-translate-y-0.5 hover:border-hover"
              >
                <span className="text-3xl" aria-hidden>
                  {p.icon}
                </span>
                <h3 className="mt-4 font-semibold text-primary">{p.title}</h3>
                <p className="mt-2 text-sm text-secondary leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
