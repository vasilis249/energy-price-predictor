import { describe, expect, it } from "vitest";
import { parseConsent, serializeConsent } from "./consent";

describe("consent cookie", () => {
  it("round-trips", () => {
    expect(parseConsent(serializeConsent({ analytics: true }))).toEqual({ analytics: true });
    expect(parseConsent(serializeConsent({ analytics: false }))).toEqual({ analytics: false });
  });

  it("treats missing, malformed or outdated values as no consent", () => {
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent("v0.analytics-1")).toBeNull();
  });
});
