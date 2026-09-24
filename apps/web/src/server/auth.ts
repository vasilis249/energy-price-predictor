import "server-only";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Tables } from "@/lib/supabase/database.types";
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
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, locale")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
});

export type CurrentOrg = Pick<
  Tables<"organizations">,
  "id" | "name" | "market_role" | "legal_name" | "vat_number" | "phone" | "verification_status" | "verification_note"
> & { role: "owner" | "member" };

/**
 * The user's organization. Users belong to exactly one (created at signup); when invitations
 * arrive this becomes "the selected organization".
 */
export const getCurrentOrg = cache(async (): Promise<CurrentOrg | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "role, organizations(id, name, market_role, legal_name, vat_number, phone, verification_status, verification_note)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  // Never treat a failed query as "no organization": that would send the user to onboarding.
  if (error) throw error;
  if (!data?.organizations) return null;
  return { ...data.organizations, role: data.role };
});

/** Onboarding is complete once the organization has a role and company details. */
export function needsOnboarding(org: CurrentOrg | null): boolean {
  return !org || !org.market_role || !org.vat_number || !org.legal_name || !org.phone;
}

export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) throw error;
  return data === true;
});
