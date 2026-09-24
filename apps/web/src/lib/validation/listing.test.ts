import { describe, expect, it } from "vitest";
import { estimateBiogasM3, estimateElectricityMWh } from "../market";
import { toFieldErrors } from "./form";
import { listingSchema, priceModeOf, toSignedPrice } from "./listing";

const base = {
  siteId: "4f6d1b1e-8c5e-4c1a-9a57-2d7b3a5e8f10",
  feedstockCode: "cattle_slurry",
  title: "Υγρή κοπριά 60 αγελάδων",
  unit: "m3",
  quantity: "120",
  quantityPeriod: "month",
  availableFrom: "2026-10-01",
  availableUntil: "",
  transport: "buyer_collects",
  priceMode: "gate_fee",
  priceAmount: "2,5",
};

describe("listingSchema", () => {
  it("turns a gate fee into a negative price", () => {
    const v = listingSchema.parse(base);
    expect(v).toMatchObject({ pricePerUnit: -2.5, quantity: 120, availableUntil: undefined });
    expect(v).not.toHaveProperty("priceMode");
  });

  it("free listings need no amount; paid ones do", () => {
    expect(listingSchema.parse({ ...base, priceMode: "free", priceAmount: "" }).pricePerUnit).toBe(0);
    const r = listingSchema.safeParse({ ...base, priceMode: "buyer_pays", priceAmount: "" });
    expect(toFieldErrors(r.error!)).toEqual({ priceAmount: "priceRequired" });
  });

  it("checks dates and required fields", () => {
    const r = listingSchema.safeParse({ ...base, title: "ab", availableUntil: "2026-09-01", quantity: "0" });
    // All problems are reported at once.
    expect(toFieldErrors(r.error!)).toEqual({
      title: "tooShort",
      quantity: "outOfRange",
      availableUntil: "untilBeforeFrom",
    });
    const r2 = listingSchema.safeParse({ ...base, availableUntil: "2026-09-01" });
    expect(toFieldErrors(r2.error!)).toEqual({ availableUntil: "untilBeforeFrom" });
  });
});

describe("price helpers", () => {
  it("round-trips modes and signs", () => {
    expect(toSignedPrice("buyer_pays", 3.456)).toBe(3.46);
    expect(toSignedPrice("gate_fee", 4)).toBe(-4);
    expect(priceModeOf(-4)).toBe("gate_fee");
    expect(priceModeOf(0)).toBe("free");
    expect(priceModeOf(12)).toBe("buyer_pays");
  });
});

describe("estimates", () => {
  it("estimates biogas and electricity", () => {
    expect(estimateBiogasM3(120, 25)).toBe(3000);
    expect(estimateBiogasM3(120, null)).toBeNull();
    expect(estimateElectricityMWh(3000)).toBe(6.6);
  });
});
