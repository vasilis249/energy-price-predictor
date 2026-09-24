import "server-only";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { ListingInput } from "@/lib/validation/listing";

export type Listing = Tables<"listings">;
export type ListingStatus = Database["public"]["Enums"]["listing_status"];
export type SearchResult = Database["public"]["Functions"]["search_listings"]["Returns"][number];

// Sellers work on their own rows (RLS). Buyers only go through search_listings(), which hides exact locations.

export async function listMyListings(orgId: string): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMyListing(id: string): Promise<Listing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

function toRow(listing: ListingInput) {
  return {
    site_id: listing.siteId,
    feedstock_code: listing.feedstockCode,
    title: listing.title,
    description: listing.description ?? null,
    unit: listing.unit,
    quantity: listing.quantity,
    quantity_period: listing.quantityPeriod,
    available_from: listing.availableFrom,
    available_until: listing.availableUntil ?? null,
    dm_pct: listing.dmPct ?? null,
    transport: listing.transport,
    price_per_unit: listing.pricePerUnit,
  };
}

export async function createListing(orgId: string, listing: ListingInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({ org_id: orgId, ...toRow(listing) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateListing(id: string, listing: ListingInput): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").update(toRow(listing)).eq("id", id).select("id");
  if (error) throw error;
  return data.length > 0;
}

export async function deleteDraftListing(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("listings").delete().eq("id", id).select("id");
  if (error) throw error;
  return data.length > 0;
}

export type StatusChangeError = "notVerified" | "periodEnded" | "closed" | "notFound";

/** Returns null on success, or why the database refused the change. */
export async function setListingStatus(id: string, status: ListingStatus): Promise<StatusChangeError | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_listing_status", { p_listing_id: id, p_status: status });
  if (!error) return null;
  if (error.message.includes("only verified sellers")) return "notVerified";
  if (error.message.includes("availability period")) return "periodEnded";
  if (error.message.includes("closed listing")) return "closed";
  if (error.code === "P0002") return "notFound";
  throw error;
}

export type SearchFilters = {
  siteId: string;
  feedstockCodes?: string[];
  maxKm?: number;
  price?: "paid" | "free" | "gate_fee";
  listingId?: string;
};

export async function searchListings(filters: SearchFilters): Promise<SearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_listings", {
    p_site_id: filters.siteId,
    p_feedstock_codes: filters.feedstockCodes?.length ? filters.feedstockCodes : undefined,
    p_max_km: filters.maxKm,
    p_price: filters.price,
    p_listing_id: filters.listingId,
  });
  if (error) throw error;
  return data ?? [];
}
