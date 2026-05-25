import Link from "next/link";

interface SiteHeaderProps {
  active?: "home" | "upload" | "dashboard";
}

export function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-sm">
            AI
          </span>
          <span>Reconciliation Engine</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm sm:flex">
          <Link
            href="/"
            className={
              active === "home"
                ? "text-sky-400"
                : "text-slate-400 hover:text-slate-200"
            }
          >
            Home
          </Link>
          {active === "home" && (
            <>
              <Link
                href="#features"
                className="text-slate-400 hover:text-slate-200"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-slate-400 hover:text-slate-200"
              >
                How it works
              </Link>
            </>
          )}
          <Link
            href="/upload"
            className={
              active === "upload"
                ? "text-sky-400"
                : "text-slate-400 hover:text-slate-200"
            }
          >
            Upload
          </Link>
          <Link
            href="/dashboard"
            className={
              active === "dashboard"
                ? "text-sky-400"
                : "text-slate-400 hover:text-slate-200"
            }
          >
            Dashboard
          </Link>
          <Link
            href="/upload"
            className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-medium text-white hover:from-sky-400 hover:to-indigo-400"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
