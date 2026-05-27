import { ActivityFeed } from "@/components/landing/ActivityFeed";
import { AnimatedBorderButton } from "@/components/AnimatedBorderButton";
import { GradientMesh } from "@/components/landing/GradientMesh";
import { ParticleField } from "@/components/landing/ParticleField";
import { TypewriterHeadline } from "@/components/landing/TypewriterHeadline";
import { AnimatedTransactionCounter } from "@/components/landing/AnimatedTransactionCounter";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center border-b border-default dot-grid overflow-hidden">
      <GradientMesh />
      <ParticleField />
      <div className="relative z-[2] mx-auto max-w-[1200px] w-full px-4 py-20 md:px-8 md:py-28 text-center flex flex-col items-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-active bg-[rgba(56,189,248,0.08)] px-4 py-1.5 text-sm text-accent">
          {APP_NAME}
        </div>

        <TypewriterHeadline />

        <p className="mt-6 max-w-[550px] text-lg text-secondary leading-relaxed">
          {APP_TAGLINE}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <AnimatedBorderButton href="/login?role=team" className="w-full sm:w-auto">
            Start Reconciliation →
          </AnimatedBorderButton>
          <Link
            href="/login?role=admin"
            className="btn-ghost px-8 py-3.5 text-base w-full sm:w-auto"
          >
            Admin analytics
          </Link>
        </div>

        <ActivityFeed />

        <p className="mt-6 text-sm text-muted">
          Team runs reconciliation · Admin views reports & AI insights
        </p>

        <AnimatedTransactionCounter />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-2xl stagger">
          <div>
            <p className="text-2xl font-bold text-accent tabular-nums">&lt; 30s</p>
            <p className="text-sm text-muted mt-1">Processing time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent tabular-nums">97%+</p>
            <p className="text-sm text-muted mt-1">Match accuracy</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent tabular-nums">100%</p>
            <p className="text-sm text-muted mt-1">Audit trail coverage</p>
          </div>
        </div>
      </div>
    </section>
  );
}
