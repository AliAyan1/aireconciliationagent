import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { LandingCursor } from "@/components/landing/LandingCursor";
import { GradientMesh } from "@/components/landing/GradientMesh";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-primary overflow-x-hidden">
      <GradientMesh />
      <LandingCursor />
      <div className="relative z-[1]">
        <SiteHeader active="home" />
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <ComparisonSection />
        <CtaSection />
        <SiteFooter />
      </div>
    </div>
  );
}
