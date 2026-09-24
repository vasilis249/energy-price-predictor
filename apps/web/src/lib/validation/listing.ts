import { z } from "zod";
import { decimal, optionalDecimal, optionalText, requiredText } from "./form";

export const quantityUnits = ["t", "m3"] as const;
export const quantityPeriods = ["week", "month", "year"] as const;
export const transportTerms = ["seller_delivers", "buyer_collects", "negotiable"] as const;
/** How money flows. Stored as the sign of price_per_unit: + buyer pays, 0 free, - seller pays (gate fee). */
export const priceModes = ["buyer_pays", "free", "gate_fee"] as const;
export type PriceMode = (typeof priceModes)[number];

const isoDate = z.string({ error: "required" }).regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate");
const optionalIsoDate = z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional());

const listingFields = z.object({
  siteId: z.uuid({ error: "required" }),
  feedstockCode: z.string({ error: "required" }).regex(/^[a-z0-9_]+$/, "required"),
  title: requiredText(120).pipe(z.string().min(3, "tooShort")),
  description: optionalText(4000),
  unit: z.enum(quantityUnits, { error: "required" }),
  quantity: decimal(0, 1_000_000, { exclusiveMin: true }),
  quantityPeriod: z.enum(quantityPeriods, { error: "required" }),
  availableFrom: isoDate,
  availableUntil: optionalIsoDate,
  dmPct: optionalDecimal(0, 100, { exclusiveMin: true }),
  transport: z.enum(transportTerms, { error: "required" }),
  priceMode: z.enum(priceModes, { error: "required" }),
  priceAmount: optionalDecimal(0, 10_000),
});

export const listingSchema = listingFields
  .superRefine((v, ctx) => {
    if (v.availableUntil && v.availableUntil < v.availableFrom) {
      ctx.addIssue({ code: "custom", path: ["availableUntil"], message: "untilBeforeFrom" });
    }
    if (v.priceMode !== "free" && !(v.priceAmount && v.priceAmount > 0)) {
      ctx.addIssue({ code: "custom", path: ["priceAmount"], message: "priceRequired" });
    }
  })
  .transform(({ priceMode, priceAmount, ...rest }) => ({
    ...rest,
    pricePerUnit: toSignedPrice(priceMode, priceAmount ?? 0),
  }));

export type ListingInput = z.output<typeof listingSchema>;

export function toSignedPrice(mode: PriceMode, amount: number): number {
  if (mode === "free") return 0;
  const rounded = Math.round(amount * 100) / 100;
  return mode === "gate_fee" ? -rounded : rounded;
}

export function priceModeOf(pricePerUnit: number): PriceMode {
  return pricePerUnit > 0 ? "buyer_pays" : pricePerUnit < 0 ? "gate_fee" : "free";
}
