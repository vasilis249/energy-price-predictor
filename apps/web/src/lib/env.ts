import { z } from "zod";

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them in client bundles.
const publicEnvSchema = z.object({
  // Only the origin: people often paste the REST URL (".../rest/v1/") shown in the dashboard.
  NEXT_PUBLIC_SUPABASE_URL: z.url().transform((url) => new URL(url).origin),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_CONTACT_EMAIL: z.email().default("support@example.com"),
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined,
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED || undefined,
});

if (!parsed.success) {
  const problems = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.input === undefined ? "missing or empty" : issue.message}`,
  );
  throw new Error(
    [
      "Invalid web app configuration:",
      ...problems,
      "Copy .env.example to apps/web/.env.local, fill in these values, then restart `pnpm dev`.",
    ].join("\n"),
  );
}

export const publicEnv = parsed.data;
