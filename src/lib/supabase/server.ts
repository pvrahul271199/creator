import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseEnv, supabaseKey, supabaseUrl } from "./config";

export { hasSupabaseEnv };

/** Server-side Supabase client bound to the signed-in user's cookies. RLS applies. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl()!, supabaseKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}
