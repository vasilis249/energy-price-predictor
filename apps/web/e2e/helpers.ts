import { expect, type BrowserContext, type Page } from "@playwright/test";
import { waitForEmailLink } from "./mailpit";

export const PASSWORD = "Biogas2026Strong";

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

/** Pre-answer the cookie banner so it doesn't cover the page under test. */
export async function acceptNecessaryCookies(context: BrowserContext, baseURL = "http://localhost:3000") {
  await context.addCookies([{ name: "cookie_consent", value: "v1.analytics-0", url: baseURL }]);
}

/** Sign up in Greek (default locale) and confirm the email through Mailpit. Ends signed in on the dashboard. */
export async function signUpAndConfirm(
  page: Page,
  { name, org, email }: { name: string; org?: string; email: string },
) {
  const started = new Date(Date.now() - 1000);
  await acceptNecessaryCookies(
    page.context(),
    new URL(page.url() === "about:blank" ? "http://localhost:3000" : page.url()).origin,
  );
  await page.goto("/signup");
  await page.getByLabel("Ονοματεπώνυμο").fill(name);
  if (org) await page.getByLabel(/Επωνυμία εταιρείας/).fill(org);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Κωδικός πρόσβασης").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Δημιουργία λογαριασμού" }).click();
  await expect(page.getByRole("heading", { name: "Ελέγξτε το email σας" })).toBeVisible();

  const link = await waitForEmailLink(email, /Επιβεβαίωση email/, "/auth/confirm", started);
  expect(link).toContain("locale=el");
  await page.goto(link);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: `Καλώς ήρθατε, ${name}` })).toBeVisible();
}
