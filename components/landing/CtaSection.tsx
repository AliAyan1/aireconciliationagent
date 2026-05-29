import { AnimatedBorderButton } from "@/components/AnimatedBorderButton";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export function CtaSection() {
  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <ScrollReveal>
          <div className="glass-card p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">
              Ready to run HisaabAI?
            </h2>
            <AnimatedBorderButton href="/upload" className="mt-8">
              Start Reconciliation →
            </AnimatedBorderButton>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
