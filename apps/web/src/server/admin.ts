import "server-only";
import { notFound } from "next/navigation";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "./auth";

/** 404 for everyone who isn't a platform admin (don't reveal that the page exists). */
export async function requireAdmin(): Promise<void> {
  if (!(await isPlatformAdmin())) notFound();
}

export type AdminOrganization = Pick<
  Tables<"organizations">,
  | "id"
  | "name"
  | "legal_name"
  | "vat_number"
  | "phone"
  | "market_role"
  | "verification_status"
  | "verification_note"
  | "created_at"
>;

/** Readable through the "organizations: admins read all" RLS policy. */
export async function listOrganizations(filter: "pending" | "all"): Promise<AdminOrganization[]> {
  await requireAdmin();
  const supabase = await createClient();
  let query = supabase
    .from("organizations")
    .select("id, name, legal_name, vat_number, phone, market_role, verification_status, verification_note, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "pending") query = query.eq("verification_status", "pending");
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
