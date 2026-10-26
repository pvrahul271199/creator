import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseKey, supabaseUrl } from "./config";

/**
 * Refreshes the Supabase session cookie and applies the optimistic route guard.
 * This is only the first line of defence: every page and action re-validates the
 * user on the server (see lib/auth.ts), and RLS protects the data itself.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = supabaseUrl();
  const key = supabaseKey();
  const path = request.nextUrl.pathname;
  const isPublic = path === "/login" || path.startsWith("/auth/");

  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() validates the token with Supabase Auth instead of trusting the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  if (user && path === "/login") {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}
