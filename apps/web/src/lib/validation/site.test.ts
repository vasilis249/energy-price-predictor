import { describe, expect, it } from "vitest";
import { toFieldErrors } from "./form";
import { siteSchema } from "./site";

describe("siteSchema", () => {
  it("parses coordinates with Greek decimal commas", () => {
    const site = siteSchema.parse({
      name: "Φάρμα",
      siteType: "livestock_farm",
      latitude: "39,639",
      longitude: "22,419",
    });
    expect(site).toMatchObject({ latitude: 39.639, longitude: 22.419 });
  });

  it("requires a location inside Greece", () => {
    const result = siteSchema.safeParse({ name: "X", siteType: "other", latitude: "48.85", longitude: "" });
    expect(toFieldErrors(result.error!)).toEqual({ latitude: "outOfRange", longitude: "required" });
  });
});
