import { describe, expect, it } from "vitest";
import el from "../../messages/el.json";
import en from "../../messages/en.json";

function entries(obj: object, prefix = ""): [string, unknown][] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? entries(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v] as [string, unknown]],
  );
}
const keys = (obj: object) => entries(obj).map(([k]) => k);

describe("translations", () => {
  it("Greek and English have exactly the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(el).sort());
  });

  it("have no empty strings", () => {
    for (const messages of [el, en]) {
      const empty = entries(messages).filter(([, v]) => typeof v !== "string" || v.trim() === "");
      expect(empty).toEqual([]);
    }
  });
});
