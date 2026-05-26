import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ProblemSection } from "@/components/landing/ProblemSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-primary">
      <SiteHeader active="home" />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <ComparisonSection />
      <CtaSection />
      <SiteFooter />
    </div>
  );
}
