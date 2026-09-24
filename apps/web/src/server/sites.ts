import "server-only";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SiteInput } from "@/lib/validation/site";

export type Site = Tables<"sites">;

// All queries run as the signed-in user; RLS limits them to the user's organization.

export async function listSites(orgId: string): Promise<Site[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getSite(id: string): Promise<Site | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

function toRow(site: SiteInput) {
  return {
    name: site.name,
    site_type: site.siteType,
    address: site.address ?? null,
    municipality: site.municipality ?? null,
    latitude: site.latitude,
    longitude: site.longitude,
    notes: site.notes ?? null,
  };
}

export async function createSite(orgId: string, site: SiteInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .insert({ org_id: orgId, ...toRow(site) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Returns false when nothing was updated (not found or not allowed). */
export async function updateSite(id: string, site: SiteInput): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").update(toRow(site)).eq("id", id).select("id");
  if (error) throw error;
  return data.length > 0;
}

export async function deleteSite(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").delete().eq("id", id).select("id");
  if (error) throw error;
  return data.length > 0;
}
