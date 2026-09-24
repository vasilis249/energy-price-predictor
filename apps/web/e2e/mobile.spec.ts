import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const path of ["/", "/en", "/login", "/signup", "/feedstocks", "/privacy"]) {
  test(`${path} fits a phone screen`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test("cookie banner remembers the choice", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Cookies" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Μόνο απαραίτητα" }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(banner).toBeHidden();
});
