import { ScrollReveal } from "@/components/landing/ScrollReveal";

const steps = [
  { n: 1, title: "Upload", desc: "Drop your bank statement and ledger CSV files" },
  { n: 2, title: "AI Match", desc: "Smart matching with fuzzy logic and confidence scores" },
  { n: 3, title: "Review", desc: "Approve or reject uncertain matches with one click" },
  { n: 4, title: "Export", desc: "Download your reconciliation report with full audit trail" },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-24 border-b border-default">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <ScrollReveal>
          <h2 className="text-center text-2xl md:text-3xl font-bold tracking-tight text-primary">
            How it works
          </h2>
        </ScrollReveal>
        <ScrollReveal className="mt-14" stagger>
          <div className="flex flex-col md:flex-row items-start md:items-start justify-between gap-8 md:gap-4">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="scroll-reveal-item flex-1 flex flex-col items-center text-center relative w-full"
              >
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-6 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-[var(--border-hover)]"
                    aria-hidden
                  />
                )}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
                  style={{ background: "var(--accent-gradient)" }}
                >
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold text-primary">{s.title}</h3>
                <p className="mt-2 text-sm text-secondary max-w-[200px]">{s.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
