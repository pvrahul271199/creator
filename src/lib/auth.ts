import { cache } from "react";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";
import { DEMO_PROFILE, DEMO_USER, DEMO_USER_ID } from "@/lib/demo";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export { DEMO_USER_ID, DEMO_USER, DEMO_PROFILE };

/** True until a Supabase URL and key are configured. */
export const isDemoMode = () => !hasSupabaseEnv();

/** Returns the signed-in user, or null. Never redirects. */
export const getOptionalUser = cache(async () => {
  if (isDemoMode()) return DEMO_USER;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Server-side session validation. Redirects to /login when signed out.
 * In demo mode (no Supabase env) it returns a stable mock user.
 */
export const requireUser = cache(async () => {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
});

async function loadProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (data) return data as Profile;
  // The signup trigger normally creates the row; this is the safe, idempotent fallback.
  await supabase.rpc("ensure_profile");
  const retry = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (retry.data as Profile | null) ?? null;
}

/** Profile of the signed-in user, or null when signed out. */
export const getOptionalProfile = cache(async (): Promise<Profile | null> => {
  if (isDemoMode()) return DEMO_PROFILE;
  const user = await getOptionalUser();
  if (!user) return null;
  return loadProfile(user.id);
});

export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const profile = isDemoMode() ? DEMO_PROFILE : await loadProfile(user.id);
  if (!profile) redirect("/login?error=profile");
  return profile;
});
