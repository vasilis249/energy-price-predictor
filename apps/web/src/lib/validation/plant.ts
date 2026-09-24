import { z } from "zod";
import { decimal, integer, optionalDecimal, optionalText, requiredText, toFieldErrors, type FieldErrors } from "./form";

export const plantTypes = ["biogas", "pv", "wind", "small_hydro", "other"] as const;
export const supportSchemes = ["fip", "fit", "merchant", "unknown"] as const;
export type PlantType = (typeof plantTypes)[number];
export type SupportScheme = (typeof supportSchemes)[number];

const plantSchema = z.object({
  name: requiredText(120),
  plantType: z.enum(plantTypes, { error: "required" }),
  capacityMw: decimal(0, 1000, { exclusiveMin: true }),
  supportScheme: z.enum(supportSchemes, { error: "required" }),
  locationName: optionalText(120),
  // Bounding box of Greece (incl. islands); matches the DB check constraints.
  latitude: optionalDecimal(34, 42.5),
  longitude: optionalDecimal(19, 30),
  notes: optionalText(2000),
});

const biogasSchema = z.object({
  avgProductionMw: decimal(0, 1000, { exclusiveMin: true }),
  gasStorageHours: decimal(0, 72),
  minLoadPct: decimal(0, 100),
  maxLoadMw: decimal(0, 1000, { exclusiveMin: true }),
  maxStartsPerDay: integer(1, 24),
  rampMwPerHour: optionalDecimal(0, 1000, { exclusiveMin: true }),
  minUpHours: decimal(0, 24),
  minDownHours: decimal(0, 24),
});

export type PlantInput = z.infer<typeof plantSchema>;
export type BiogasInput = z.infer<typeof biogasSchema>;
export type PlantFormResult =
  { success: true; plant: PlantInput; biogas: BiogasInput | null } | { success: false; fieldErrors: FieldErrors };

/** Validate a plant form (flat object of form values). Biogas fields are required only for biogas plants. */
export function parsePlantForm(values: Record<string, unknown>): PlantFormResult {
  const plant = plantSchema.safeParse(values);
  const isBiogas = values.plantType === "biogas";
  const biogas = isBiogas ? biogasSchema.safeParse(values) : null;

  const fieldErrors: FieldErrors = {
    ...(plant.success ? {} : toFieldErrors(plant.error)),
    ...(biogas && !biogas.success ? toFieldErrors(biogas.error) : {}),
  };

  if (plant.success) {
    const { latitude, longitude } = plant.data;
    if ((latitude === undefined) !== (longitude === undefined)) {
      fieldErrors[latitude === undefined ? "latitude" : "longitude"] ??= "coordinatesPair";
    }
  }
  if (plant.success && biogas?.success) {
    const b = biogas.data;
    if (b.maxLoadMw > plant.data.capacityMw) fieldErrors.maxLoadMw ??= "maxLoadExceedsCapacity";
    if (b.avgProductionMw > b.maxLoadMw) fieldErrors.avgProductionMw ??= "avgExceedsMaxLoad";
  }

  if (Object.keys(fieldErrors).length > 0 || !plant.success) {
    return { success: false, fieldErrors };
  }
  return { success: true, plant: plant.data, biogas: biogas?.success ? biogas.data : null };
}
