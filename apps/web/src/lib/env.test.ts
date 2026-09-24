import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEnv(vars: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  return (await import("./env")).publicEnv;
}

afterEach(() => vi.unstubAllEnvs());

describe("publicEnv", () => {
  it("keeps only the origin of the Supabase URL", async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://qfdhrdwexdcmrqmsxjhx.supabase.co/rest/v1/",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://qfdhrdwexdcmrqmsxjhx.supabase.co");
  });

  it("explains missing values", async () => {
    await expect(loadEnv({ NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })).rejects.toThrow(
      /NEXT_PUBLIC_SUPABASE_URL: missing or empty[\s\S]*apps\/web\/\.env\.local/,
    );
  });
});
