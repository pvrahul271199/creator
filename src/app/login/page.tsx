import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto w-10 h-10 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold">
            B
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Welcome to Boardroom</h1>
          <p className="text-sm text-[var(--muted)]">
            Brand deals, invoices and payments for creators. Sign in to continue.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
