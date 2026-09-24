/** Pure helpers for marketplace figures (shared by server and client components). */

/**
 * Indicative biogas volume (m³) for a quantity of feedstock, using the catalog's typical yield per
 * tonne of fresh matter. Liquids in m³ are treated as ~1 t/m³. Returns null if the yield is unknown.
 */
export function estimateBiogasM3(quantity: number, typicalYieldPerTonne: number | null): number | null {
  if (typicalYieldPerTonne === null || !Number.isFinite(quantity) || quantity <= 0) return null;
  return Math.round((quantity * typicalYieldPerTonne) / 10) * 10;
}

/** Approximate electricity (MWh) a CHP engine makes from that biogas: ~55% CH4, 10 kWh/m³ CH4, 40% electrical. */
export function estimateElectricityMWh(biogasM3: number | null): number | null {
  if (biogasM3 === null) return null;
  return Math.round(biogasM3 * 0.55 * 10 * 0.4) / 1000;
}
