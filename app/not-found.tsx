import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-primary">
      <SiteHeader active="home" />
      <main className="mx-auto max-w-2xl px-4 py-24 md:px-8">
        <div className="glass-card p-8 md:p-10 text-center">
          <p className="text-sm text-muted">404</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-primary">
            Page not found
          </h1>
          <p className="mt-3 text-sm text-secondary leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist, or the link is outdated.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="btn-ghost w-full sm:w-auto px-6 py-2.5 text-sm">
              Home
            </Link>
            <Link href="/upload" className="btn-primary w-full sm:w-auto px-6 py-2.5 text-sm">
              Start new reconciliation
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

