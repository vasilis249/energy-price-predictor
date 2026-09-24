import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Refresh the Supabase session on every request and write updated auth cookies onto `response`.
 * Returns the user id from the verified JWT claims, or null when signed out.
 */
export async function refreshSession(request: NextRequest, response: NextResponse): Promise<string | null> {
  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}
