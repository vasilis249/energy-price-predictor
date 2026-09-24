import { z } from "zod";

export const distanceOptions = [10, 25, 50, 100, 200] as const;
export const priceFilters = ["paid", "free", "gate_fee"] as const;

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);

/** Search filters from the URL. Invalid values fall back to "no filter" instead of failing. */
export const searchParamsSchema = z.object({
  site: z.preprocess(one, z.uuid().optional().catch(undefined)),
  type: z.preprocess(
    one,
    z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .optional()
      .catch(undefined),
  ),
  km: z.preprocess(
    (v) => (one(v) === undefined || one(v) === "" ? undefined : Number(one(v))),
    z
      .union(distanceOptions.map((d) => z.literal(d)))
      .optional()
      .catch(undefined),
  ),
  price: z.preprocess(one, z.enum(priceFilters).optional().catch(undefined)),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
