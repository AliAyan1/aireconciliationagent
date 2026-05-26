"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import type { AuthRole } from "@/lib/auth-types";

interface SiteHeaderProps {
  active?: "home" | "upload" | "dashboard" | "history" | "admin";
  role?: AuthRole;
}

const teamLinks = [
  { href: "/upload", label: "Upload", key: "upload" as const },
  { href: "/dashboard", label: "Dashboard", key: "dashboard" as const },
  { href: "/history", label: "History", key: "history" as const },
];

const adminLinks = [{ href: "/admin", label: "Analytics", key: "admin" as const }];

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-[rgba(56,189,248,0.1)] text-accent"
          : "text-secondary hover:text-primary hover:bg-card-hover"
      }`}
    >
      {label}
    </Link>
  );
}

export function SiteHeader({ active, role }: SiteHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const navLinks = role === "ADMIN" ? adminLinks : role === "TEAM" ? teamLinks : [];
  const homeHref = role === "ADMIN" ? "/admin" : role === "TEAM" ? "/upload" : "/";
  const ctaHref = role === "ADMIN" ? "/admin" : "/login?role=team";
  const ctaLabel =
    role === "ADMIN"
      ? "Analytics"
      : role === "TEAM"
        ? "Upload"
        : "Sign in";

  useEffect(() => {
    if (!role) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: { name: string } } | null) => {
        if (data?.user?.name) setUserName(data.user.name);
      })
      .catch(() => {});
  }, [role]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-default bg-primary/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 md:px-8">
        <Link href={homeHref} className="flex shrink-0 items-center">
          <BrandLogo size="md" />
        </Link>

        {role && (
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 border border-default text-muted">
            {role === "ADMIN" ? "Admin" : "Team"}
          </span>
        )}

        <nav
          className="hidden flex-1 items-center justify-center gap-1 md:flex"
          aria-label="Main"
        >
          {role ? (
            navLinks.map((l) => (
              <NavLink
                key={l.key}
                href={l.href}
                label={l.label}
                active={active === l.key}
              />
            ))
          ) : (
            <>
              <NavLink href="/" label="Home" active={active === "home"} />
              <NavLink href="/login?role=team" label="Sign in" active={false} />
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {userName && (
            <span className="hidden lg:inline text-xs text-secondary max-w-[120px] truncate">
              {userName}
            </span>
          )}
          <ThemeToggle />
          {role ? (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="btn-ghost hidden md:inline-flex px-3 py-2 text-sm"
            >
              Sign out
            </button>
          ) : (
            <Link
              href={ctaHref}
              className="btn-primary hidden md:inline-flex px-4 py-2 text-sm"
            >
              {ctaLabel}
            </Link>
          )}
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-sm md:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-default bg-elevated px-4 py-3 md:hidden flex flex-col gap-1"
          aria-label="Mobile"
        >
          {role ? (
            <>
              {navLinks.map((l) => (
                <NavLink
                  key={l.key}
                  href={l.href}
                  label={l.label}
                  active={active === l.key}
                  onNavigate={() => setOpen(false)}
                />
              ))}
              <button
                type="button"
                className="btn-ghost mt-2 py-2.5 text-sm text-left"
                onClick={() => {
                  setOpen(false);
                  void handleLogout();
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink
                href="/"
                label="Home"
                active={active === "home"}
                onNavigate={() => setOpen(false)}
              />
              <Link
                href="/login?role=team"
                className="btn-primary mt-2 text-center py-2.5 text-sm"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
