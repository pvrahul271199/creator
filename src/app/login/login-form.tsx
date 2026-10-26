"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MESSAGES: Record<string, string> = {
  auth: "Sign-in was cancelled or failed. Please try again.",
  profile: "We could not load your profile. Please sign in again.",
  expired: "Your session expired. Please sign in again.",
};

export function LoginForm() {
  const params = useSearchParams();
  const errorKey = params.get("error");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(errorKey ? (MESSAGES[errorKey] ?? MESSAGES.auth) : null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm rounded-md border border-[var(--overdue)]/30 bg-[var(--overdue)]/10 text-[var(--overdue-text)] p-3">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        className="w-full h-11 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-60 transition"
      >
        {loading ? "Redirecting to Google…" : "Continue with Google"}
      </button>
    </div>
  );
}
