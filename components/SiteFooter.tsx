import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold text-white">
            AI
          </span>
          <span>Reconciliation Engine · MVP</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300">
            Home
          </Link>
          <Link href="/upload" className="hover:text-slate-300">
            Upload
          </Link>
          <Link href="/dashboard" className="hover:text-slate-300">
            Dashboard
          </Link>
          <Link href="#features" className="hover:text-slate-300">
            Features
          </Link>
        </nav>
        <p className="text-xs text-slate-600">PKR · CSV · OpenAI-ready</p>
      </div>
    </footer>
  );
}
