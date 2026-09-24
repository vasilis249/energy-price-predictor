import { expect, type BrowserContext, type Page } from "@playwright/test";
import pg from "pg";
import { waitForEmailLink } from "./mailpit";

export const PASSWORD = "Biogas2026Strong";

// Valid Greek VAT numbers (ΑΦΜ check digit OK). Each business needs a different one per role.
let afmCounter = 0;
export function validAfm(): string {
  const base = String(10_000_000 + Math.floor(Math.random() * 80_000_000) + afmCounter++).slice(0, 8);
  const sum = [...base].reduce((s, d, i) => s + Number(d) * 2 ** (8 - i), 0);
  return base + String((sum % 11) % 10);
}

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

/** Pre-answer the cookie banner so it doesn't cover the page under test. */
export async function acceptNecessaryCookies(context: BrowserContext, baseURL = "http://localhost:3000") {
  await context.addCookies([{ name: "cookie_consent", value: "v1.analytics-0", url: baseURL }]);
}

type SignupOptions = { name: string; org?: string; email: string; role: "seller" | "buyer"; legalName?: string };

/** Sign up in Greek, confirm the email through Mailpit and complete onboarding. Ends on the dashboard. */
export async function signUpAndOnboard(page: Page, opts: SignupOptions) {
  await signUpAndConfirm(page, opts);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel(/Επωνυμία/).fill(opts.legalName ?? `${opts.name} ΙΚΕ`);
  await page.getByLabel("ΑΦΜ").fill(validAfm());
  await page.getByLabel("Τηλέφωνο επικοινωνίας").fill("6912345678");
  await page.getByRole("button", { name: "Συνέχεια" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: `Καλώς ήρθατε, ${opts.name}` })).toBeVisible();
}

/** Sign up and confirm the email. Ends signed in (on the onboarding page). */
export async function signUpAndConfirm(page: Page, { name, org, email, role }: SignupOptions) {
  const started = new Date(Date.now() - 1000);
  await acceptNecessaryCookies(page.context());
  await page.goto("/signup");
  await page.getByText(role === "seller" ? "Έχω πρώτη ύλη να διαθέσω" : "Αγοράζω πρώτη ύλη").click();
  await page.getByLabel("Ονοματεπώνυμο").fill(name);
  if (org) await page.getByLabel(/Όνομα επιχείρησης/).fill(org);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Κωδικός πρόσβασης").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Δημιουργία λογαριασμού" }).click();
  await expect(page.getByRole("heading", { name: "Ελέγξτε το email σας" })).toBeVisible();

  const link = await waitForEmailLink(email, /Επιβεβαίωση email/, "/auth/confirm", started);
  expect(link).toContain("locale=el");
  await page.goto(link);
}

// Direct database access for test setup that has no UI (e.g. making someone a platform admin).
// Supabase local by default.
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function sql(query: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(query, params)).rows;
  } finally {
    await client.end();
  }
}
