import { z } from "zod";
import { isValidAfm, normalizeAfm } from "./afm";
import { requiredText } from "./form";

export const marketRoles = ["buyer", "seller"] as const;
export type MarketRole = (typeof marketRoles)[number];

export const marketRole = z.enum(marketRoles, { error: "chooseRole" });

export const vatNumber = z.preprocess(
  (v) => (typeof v === "string" ? normalizeAfm(v) : v),
  z.string({ error: "required" }).min(1, "required").refine(isValidAfm, "invalidAfm"),
);

/** Greek phone numbers: 10 digits, optionally with +30 / 0030. Stored as "+30XXXXXXXXXX". */
export const phone = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const digits = v.replace(/[\s().\-]/g, "").replace(/^00/, "+");
    return digits.startsWith("+") ? digits : digits.length === 10 ? `+30${digits}` : digits;
  },
  z
    .string({ error: "required" })
    .min(1, "required")
    .regex(/^\+\d{11,15}$/, "invalidPhone"),
);

export const companySchema = z.object({
  legalName: requiredText(200),
  vatNumber,
  phone,
});

export const onboardingSchema = companySchema.extend({ marketRole });

export const organizationProfileSchema = companySchema.extend({ orgName: requiredText(120) });
