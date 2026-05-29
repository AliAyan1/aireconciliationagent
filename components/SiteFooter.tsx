import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-default bg-primary py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-4 text-center md:flex-row md:justify-between md:text-left md:px-8">
        <p className="text-sm text-muted">
          Hisab.ai · Built by Muzahir · © 2026
        </p>
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-secondary">
          <Link href="/upload" className="hover:text-accent transition-colors">
            Upload
          </Link>
          <Link href="/dashboard" className="hover:text-accent transition-colors">
            Dashboard
          </Link>
          <Link href="/history" className="hover:text-accent transition-colors">
            History
          </Link>
        </nav>
      </div>
    </footer>
  );
}
