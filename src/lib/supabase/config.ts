/**
 * Single source for Supabase connection settings. Either key name is accepted so a project's
 * dashboard values can be pasted in as-is (new "publishable" key or legacy "anon" key).
 */
export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** When both values are present the app runs against Supabase; otherwise it runs in demo mode. */
export function hasSupabaseEnv() {
  return Boolean(supabaseUrl() && supabaseKey());
}
