import { describe, expect, it } from "vitest";
import { isValidAfm, normalizeAfm } from "./afm";

describe("ΑΦΜ", () => {
  it.each(["090000045", "994645446", "123456783"])("accepts valid %s", (afm) => {
    expect(isValidAfm(afm)).toBe(true);
  });

  it.each(["123456789", "000000000", "12345678", "1234567890", "09000004a"])("rejects %s", (afm) => {
    expect(isValidAfm(afm)).toBe(false);
  });

  it("normalizes prefixes and separators", () => {
    expect(normalizeAfm(" el 090 000 045 ")).toBe("090000045");
    expect(normalizeAfm("GR090.000.045")).toBe("090000045");
  });
});
