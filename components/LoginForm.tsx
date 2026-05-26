"use client";

import { useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  homePathForRole,
  parseAuthRole,
  parseLoginIntent,
  resolvePostLoginPath,
} from "@/lib/auth-routes";
import type { AuthRole } from "@/lib/auth-types";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

type LoginResponse = {
  error?: string;
  redirectTo?: string;
  user?: { role: AuthRole };
};

async function loginRequest(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as LoginResponse;
  return { ok: res.ok, data, status: res.status };
}

function LoginFormFields({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  onSubmit,
  onQuickLogin,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onQuickLogin: (role: "team" | "admin") => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => onQuickLogin("team")}
          className="btn-ghost py-2.5 text-sm border border-default hover:border-accent disabled:opacity-50"
        >
          Continue as Team
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onQuickLogin("admin")}
          className="btn-ghost py-2.5 text-sm border border-default hover:border-accent disabled:opacity-50"
        >
          Continue as Admin
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-default" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted">or sign in with email</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div suppressHydrationWarning>
          <label className="block text-xs font-semibold uppercase tracking-wide text-secondary mb-1.5">
            Email
          </label>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full px-4 py-2.5 text-sm"
            placeholder={DEMO_ACCOUNTS.team.email}
            suppressHydrationWarning
          />
        </div>
        <div suppressHydrationWarning>
          <label className="block text-xs font-semibold uppercase tracking-wide text-secondary mb-1.5">
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full px-4 py-2.5 text-sm"
            placeholder="••••••••"
            suppressHydrationWarning
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-sm disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 rounded-lg bg-input" />
        <div className="h-10 rounded-lg bg-input" />
      </div>
      <div className="h-10 w-full rounded-lg bg-input" />
      <div className="h-10 w-full rounded-lg bg-input" />
      <div className="h-11 w-full rounded-lg bg-input" />
    </div>
  );
}

function LoginFormBody({ role }: { role: "team" | "admin" }) {
  const searchParams = useSearchParams();
  const account = DEMO_ACCOUNTS[role];
  const [email, setEmail] = useState<string>(account.email);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function completeLogin(
    loginEmail: string,
    loginPassword: string,
    forcedRedirect?: string
  ): Promise<boolean> {
    const { ok, data, status } = await loginRequest(loginEmail, loginPassword);
    if (!ok) {
      if (status === 503) {
        toast.error(data.error ?? "Database not configured");
      } else {
        toast.error(data.error ?? "Invalid email or password");
      }
      return false;
    }

    const role = parseAuthRole(data.user?.role);
    const fallback =
      data.redirectTo ?? homePathForRole(role);
    const dest =
      forcedRedirect ??
      resolvePostLoginPath(role, fallback, searchParams.get("next"));

    toast.success("Signed in");
    window.location.assign(dest);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await completeLogin(email, password);
    } catch {
      toast.error("Could not reach server. Is npm run dev running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(role: "team" | "admin") {
    const account = DEMO_ACCOUNTS[role];
    setEmail(account.email);
    setPassword(account.password);
    setLoading(true);
    try {
      await completeLogin(
        account.email,
        account.password,
        account.redirectTo
      );
    } catch {
      toast.error("Could not reach server. Is npm run dev running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginFormFields
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      loading={loading}
      onSubmit={(e) => void handleSubmit(e)}
      onQuickLogin={(quickRole) => void handleQuickLogin(quickRole)}
    />
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const mounted = useMounted();
  const role = parseLoginIntent(searchParams.get("role")) ?? "team";

  if (!mounted) {
    return <LoginFormSkeleton />;
  }

  return <LoginFormBody key={role} role={role} />;
}
