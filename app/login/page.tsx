import { Suspense } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";
import { APP_TAGLINE } from "@/lib/branding";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4 py-12">
      <div className="card-surface w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Sign in</h1>
          <p className="mt-2 text-sm text-secondary">{APP_TAGLINE}</p>
          <p className="mt-2 text-xs text-muted">
            Use the quick buttons below — no typing required
          </p>
        </div>

        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>

        <div className="mt-6 rounded-lg bg-input border border-default p-4 text-xs text-secondary space-y-1">
          <p className="font-semibold text-primary">Manual sign-in</p>
          <p>
            Team: {DEMO_ACCOUNTS.team.email} / {DEMO_ACCOUNTS.team.password}
          </p>
          <p>
            Admin: {DEMO_ACCOUNTS.admin.email} / {DEMO_ACCOUNTS.admin.password}
          </p>
        </div>
      </div>
    </div>
  );
}
