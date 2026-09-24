import "server-only";
import { cache } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type FeedstockType = Tables<"feedstock_types">;

/** The feedstock catalog (public reference data, readable anonymously). */
export const listFeedstockTypes = cache(async (): Promise<FeedstockType[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedstock_types")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
});
