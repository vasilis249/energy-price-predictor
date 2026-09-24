import { z } from "zod";
import { decimal, optionalText, requiredText } from "./form";

export const siteTypes = ["biogas_plant", "livestock_farm", "agriculture", "food_industry", "other"] as const;
export type SiteType = (typeof siteTypes)[number];

export const siteSchema = z.object({
  name: requiredText(120),
  siteType: z.enum(siteTypes, { error: "required" }),
  address: optionalText(200),
  municipality: optionalText(120),
  // Bounding box of Greece (incl. islands); matches the DB check constraints.
  latitude: decimal(34, 42.5),
  longitude: decimal(19, 30),
  notes: optionalText(2000),
});

export type SiteInput = z.infer<typeof siteSchema>;
