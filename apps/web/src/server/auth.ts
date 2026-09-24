import "server-only";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

/** The signed-in user from the verified JWT, or null. Deduplicated per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
});

export async function requireUser(locale: Locale): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect({ href: "/login", locale });
  return user!;
}

export const getProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, locale").eq("id", user.id).maybeSingle();
  return data;
});

export type CurrentOrg = { id: string; name: string; role: "owner" | "member" };

/**
 * The user's organization. M1 users belong to exactly one (created at signup);
 * when invitations arrive this becomes "the selected organization".
 */
export const getCurrentOrg = cache(async (): Promise<CurrentOrg | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.organizations) return null;
  return { id: data.organizations.id, name: data.organizations.name, role: data.role };
});
