import { describe, expect, it } from "vitest";
import { searchParamsSchema } from "./search";

describe("searchParamsSchema", () => {
  it("parses valid filters", () => {
    expect(
      searchParamsSchema.parse({
        site: "4f6d1b1e-8c5e-4c1a-9a57-2d7b3a5e8f10",
        type: "cheese_whey",
        km: "50",
        price: "gate_fee",
      }),
    ).toEqual({ site: "4f6d1b1e-8c5e-4c1a-9a57-2d7b3a5e8f10", type: "cheese_whey", km: 50, price: "gate_fee" });
  });

  it("ignores invalid or tampered values", () => {
    expect(searchParamsSchema.parse({ site: "x", type: "DROP TABLE", km: "37", price: "cheap" })).toEqual({});
    expect(searchParamsSchema.parse({ km: "" })).toEqual({});
  });
});
