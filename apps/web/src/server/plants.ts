import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { BiogasInput, PlantInput } from "@/lib/validation/plant";

export type Plant = Tables<"plants">;
export type PlantWithBiogas = Plant & { biogas_params: Tables<"biogas_params"> | null };

// All queries run as the signed-in user; RLS limits them to the user's organization(s).

export async function listPlants(orgId: string): Promise<Plant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getPlant(id: string): Promise<PlantWithBiogas | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("plants").select("*, biogas_params(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePlant(
  orgId: string,
  plant: PlantInput,
  biogas: BiogasInput | null,
  plantId?: string,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_plant", {
    p_org_id: orgId,
    p_plant_id: plantId,
    p_plant: {
      name: plant.name,
      plant_type: plant.plantType,
      capacity_mw: plant.capacityMw,
      support_scheme: plant.supportScheme,
      location_name: plant.locationName ?? null,
      latitude: plant.latitude ?? null,
      longitude: plant.longitude ?? null,
      notes: plant.notes ?? null,
    },
    p_biogas: biogas && {
      avg_production_mw: biogas.avgProductionMw,
      gas_storage_hours: biogas.gasStorageHours,
      min_load_pct: biogas.minLoadPct,
      max_load_mw: biogas.maxLoadMw,
      max_starts_per_day: biogas.maxStartsPerDay,
      ramp_mw_per_hour: biogas.rampMwPerHour ?? null,
      min_up_hours: biogas.minUpHours,
      min_down_hours: biogas.minDownHours,
    },
  });
  if (error) throw error;
  return data;
}

/** Returns false when nothing was deleted (not found or not allowed). */
export async function deletePlant(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("plants").delete().eq("id", id).select("id");
  if (error) throw error;
  return data.length > 0;
}
