import { describe, expect, it } from "vitest";
import { toFieldErrors } from "./form";
import { onboardingSchema } from "./organization";

describe("onboardingSchema", () => {
  it("normalizes ΑΦΜ and phone", () => {
    const result = onboardingSchema.parse({
      marketRole: "seller",
      legalName: "Κτηνοτροφική Θεσσαλίας ΙΚΕ",
      vatNumber: "EL 090000045",
      phone: "2410 123 456",
    });
    expect(result).toEqual({
      marketRole: "seller",
      legalName: "Κτηνοτροφική Θεσσαλίας ΙΚΕ",
      vatNumber: "090000045",
      phone: "+302410123456",
    });
  });

  it("accepts international formats", () => {
    expect(
      onboardingSchema.parse({
        marketRole: "buyer",
        legalName: "X",
        vatNumber: "994645446",
        phone: "0030 69 1234 5678",
      }).phone,
    ).toBe("+306912345678");
  });

  it("returns i18n keys for bad input", () => {
    const result = onboardingSchema.safeParse({
      marketRole: "farmer",
      legalName: " ",
      vatNumber: "123456789",
      phone: "12",
    });
    expect(toFieldErrors(result.error!)).toEqual({
      marketRole: "chooseRole",
      legalName: "required",
      vatNumber: "invalidAfm",
      phone: "invalidPhone",
    });
  });
});
