import { expect, test } from "@playwright/test";
import { PASSWORD, signUpAndConfirm, signUpAndOnboard, sql, uniqueEmail, validAfm } from "./helpers";
import { waitForEmailLink } from "./mailpit";

test("seller: signup → onboarding → site on the map → edit → delete → language → sign out → log in", async ({
  page,
}) => {
  const email = uniqueEmail("seller");
  await signUpAndConfirm(page, { name: "Γιώργος Παπαδόπουλος", org: "Φάρμα Αγιάς", email, role: "seller" });

  // Onboarding validates the ΑΦΜ check digit and keeps input on error.
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel(/Επωνυμία/).fill("Κτηνοτροφική Αγιάς ΙΚΕ");
  await page.getByLabel("ΑΦΜ").fill("123456789");
  await page.getByLabel("Τηλέφωνο επικοινωνίας").fill("2410 123456");
  await page.getByRole("button", { name: "Συνέχεια" }).click();
  await expect(page.getByText("Ο ΑΦΜ δεν είναι έγκυρος")).toBeVisible();
  await expect(page.getByLabel(/Επωνυμία/)).toHaveValue("Κτηνοτροφική Αγιάς ΙΚΕ");
  await page.getByLabel("ΑΦΜ").fill(validAfm());
  await page.getByRole("button", { name: "Συνέχεια" }).click();

  // Seller dashboard, awaiting verification.
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Φάρμα Αγιάς · Παραγωγός πρώτης ύλης (πωλητής)")).toBeVisible();
  await expect(page.getByText(/Ελέγχουμε τα στοιχεία της επιχείρησής σας/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Οι αγγελίες μου" })).toBeVisible();

  // Add a site: clicking the map fills the coordinates.
  await page.getByRole("link", { name: "Προσθήκη εγκατάστασης" }).first().click();
  await expect(page.getByLabel("Τύπος")).toHaveValue("livestock_farm");
  await page.getByLabel("Όνομα εγκατάστασης").fill("Βουστάσιο Αγιάς");
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page.getByText("Υποχρεωτικό πεδίο.").first()).toBeVisible();
  const map = page.getByRole("application", { name: /Χάρτης/ });
  await expect(map.locator(".leaflet-container, .leaflet-pane").first()).toBeAttached();
  await map.click();
  await expect(page.getByLabel("Γεωγραφικό πλάτος")).not.toHaveValue("");
  // Then set a precise point by hand (Greek decimal comma).
  await page.getByLabel("Γεωγραφικό πλάτος").fill("39,71");
  await page.getByLabel("Γεωγραφικό μήκος").fill("22,75");
  await page.getByLabel(/Δήμος/).fill("Δήμος Αγιάς");
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page).toHaveURL(/\/sites\?notice=created$/);
  await expect(page.getByText("Η εγκατάσταση προστέθηκε.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Βουστάσιο Αγιάς/ })).toContainText("Δήμος Αγιάς");

  // Edit.
  await page.getByRole("link", { name: /Βουστάσιο Αγιάς/ }).click();
  await expect(page.getByLabel("Γεωγραφικό πλάτος")).toHaveValue("39.71");
  await page.getByLabel("Όνομα εγκατάστασης").fill("Βουστάσιο Αγιάς 2");
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page.getByText("Η εγκατάσταση ενημερώθηκε.")).toBeVisible();

  // English UI, then delete.
  await page.getByRole("combobox", { name: "Γλώσσα" }).selectOption("en");
  await expect(page).toHaveURL(/\/en\/sites/);
  await page.getByRole("link", { name: /Βουστάσιο Αγιάς 2/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Site deleted.")).toBeVisible();

  // Sign out and back in: continues in the profile language (Greek).
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fdashboard$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Καλώς ήρθατε, Γιώργος Παπαδόπουλος" })).toBeVisible();
});

test("buyer: role preselected from the home page, buyer dashboard, public catalog", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Είμαι μονάδα βιοαερίου" }).first().click();
  await expect(page).toHaveURL(/\/signup\?role=buyer$/);
  await expect(page.getByRole("radio", { name: /Αγοράζω πρώτη ύλη/ })).toBeChecked();

  await signUpAndOnboard(page, { name: "Νίκος Βιοαέριο", email: uniqueEmail("buyer"), role: "buyer" });
  await expect(page.getByRole("heading", { name: "Αναζήτηση πρώτων υλών" })).toBeVisible();
  await page.getByRole("link", { name: "Προσθήκη εγκατάστασης" }).first().click();
  await expect(page.getByLabel("Τύπος")).toHaveValue("biogas_plant");

  await page.getByRole("link", { name: "Πρώτες ύλες" }).first().click();
  await expect(page.getByRole("heading", { name: "Πρώτες ύλες για βιοαέριο" })).toBeVisible();
  await expect(page.getByText("Τυρόγαλο")).toBeVisible();
  await expect(page.getByText("Κατσίγαρος (απόνερα ελαιοτριβείου)")).toBeVisible();
});

test("the catalog is public", async ({ page }) => {
  await page.goto("/en/feedstocks");
  await expect(page.getByRole("heading", { name: "Feedstocks for biogas" })).toBeVisible();
  await expect(page.getByText("Cattle slurry")).toBeVisible();
});

test("password reset by email", async ({ page }) => {
  const email = uniqueEmail("reset");
  await signUpAndOnboard(page, { name: "Reset User", email, role: "seller" });
  await page.getByRole("button", { name: "Αποσύνδεση" }).click();

  const requested = new Date(Date.now() - 1000);
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Αποστολή συνδέσμου" }).click();
  await expect(page.getByText(/θα λάβετε σύντομα έναν σύνδεσμο/)).toBeVisible();

  const link = await waitForEmailLink(email, /Επαναφορά κωδικού/, "/auth/confirm", requested);
  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password$/);
  const newPassword = "EvenStronger2027";
  await page.getByLabel("Νέος κωδικός").fill(newPassword);
  await page.getByLabel("Επιβεβαίωση κωδικού").fill(newPassword);
  await page.getByRole("button", { name: "Αποθήκευση κωδικού" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "Αποσύνδεση" }).click();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Κωδικός πρόσβασης").fill(newPassword);
  await page.getByRole("button", { name: "Σύνδεση" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("users cannot open another business's site", async ({ browser }) => {
  const owner = await browser.newPage();
  await signUpAndOnboard(owner, { name: "Owner", email: uniqueEmail("owner"), role: "seller" });
  await owner.goto("/sites/new");
  await owner.getByLabel("Όνομα εγκατάστασης").fill("Private Farm");
  await owner.getByLabel("Γεωγραφικό πλάτος").fill("40.1");
  await owner.getByLabel("Γεωγραφικό μήκος").fill("22.5");
  await owner.getByRole("button", { name: "Αποθήκευση" }).click();
  await owner.getByRole("link", { name: /Private Farm/ }).click();
  await owner.waitForURL(/\/sites\/[0-9a-f-]{36}$/);
  const siteUrl = new URL(owner.url()).pathname;

  const intruder = await (await browser.newContext()).newPage();
  await signUpAndOnboard(intruder, { name: "Intruder", email: uniqueEmail("intruder"), role: "buyer" });
  await intruder.goto(siteUrl);
  await expect(intruder.getByRole("heading", { name: "Η σελίδα δεν βρέθηκε" })).toBeVisible();
  await expect(intruder.getByText("Private Farm")).toHaveCount(0);
  // Non-admins get a 404 for the admin page too.
  await intruder.goto("/admin");
  await expect(intruder.getByRole("heading", { name: "Η σελίδα δεν βρέθηκε" })).toBeVisible();
});

test("an admin verifies a business", async ({ browser }) => {
  const legalName = `Τυροκομείο Ελασσόνας ${Date.now() % 1_000_000} ΑΕ`;
  const seller = await browser.newPage();
  await signUpAndOnboard(seller, {
    name: "Verify Me",
    email: uniqueEmail("verifyme"),
    role: "seller",
    legalName,
  });
  await expect(seller.getByText("Σε έλεγχο").first()).toBeVisible();

  const adminEmail = uniqueEmail("admin");
  const admin = await (await browser.newContext()).newPage();
  await signUpAndOnboard(admin, { name: "Admin", email: adminEmail, role: "buyer" });
  await sql(
    "update public.profiles set is_platform_admin = true where id = (select id from auth.users where email = $1)",
    [adminEmail],
  );
  await admin.goto("/admin");
  const card = admin.locator("li", { hasText: legalName });
  await card.getByRole("button", { name: "Επαλήθευση" }).click();
  // Verified businesses leave the "under review" list, and appear as verified under "all".
  await expect(card).toHaveCount(0);
  await admin.getByRole("link", { name: "Όλες" }).click();
  await expect(admin.locator("li", { hasText: legalName }).getByText("Επαληθευμένη")).toBeVisible();

  await seller.reload();
  await expect(seller.getByText("Επαληθευμένη").first()).toBeVisible();
  await expect(seller.getByText(/Ελέγχουμε τα στοιχεία/)).toHaveCount(0);
});
