import { defineConfig } from "vitest/config";

// RLS integration tests against a real Postgres (Supabase local or plain PG + auth shim).
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
