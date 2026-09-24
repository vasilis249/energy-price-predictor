import { expect, test } from "@playwright/test";
import { PASSWORD, signUpAndConfirm, uniqueEmail } from "./helpers";
import { waitForEmailLink } from "./mailpit";

test("signup → confirm email → create, edit and delete a biogas plant → switch language → sign out → log in", async ({
  page,
}) => {
  const email = uniqueEmail("main");
  await signUpAndConfirm(page, { name: "Μαρία Παπαδοπούλου", org: "Βιοαέριο Λάρισας ΑΕ", email });
  await expect(page.getByText("Βιοαέριο Λάρισας ΑΕ")).toBeVisible();

  // Create a biogas plant; first submit an inconsistent max load to see validation.
  await page.getByRole("link", { name: "Προσθέστε τον πρώτο σας σταθμό" }).click();
  await expect(page.getByRole("heading", { name: "Νέος σταθμός" })).toBeVisible();
  await page.getByLabel("Όνομα σταθμού").fill("ΒΙΟ Λάρισα 1");
  await page.getByLabel("Εγκατεστημένη ισχύς (MW)").fill("1,5");
  await page.getByLabel(/Μέση παραγωγή βιοαερίου/).fill("1,2");
  await page.getByLabel(/Αποθήκη αερίου/).fill("8");
  await page.getByLabel("Μέγιστο φορτίο (MW)").fill("2");
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page.getByText("Το μέγιστο φορτίο δεν μπορεί να ξεπερνά την εγκατεστημένη ισχύ.")).toBeVisible();
  // Typed values survive the failed submit.
  await expect(page.getByLabel("Όνομα σταθμού")).toHaveValue("ΒΙΟ Λάρισα 1");

  await page.getByLabel("Μέγιστο φορτίο (MW)").fill("1,5");
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page).toHaveURL(/\/plants\?notice=created$/);
  await expect(page.getByText("Ο σταθμός προστέθηκε.")).toBeVisible();
  await expect(page.getByRole("link", { name: /ΒΙΟ Λάρισα 1/ })).toContainText("1,5");

  // FiT notice appears when choosing a fixed tariff; biogas section hides for PV.
  await page.getByRole("link", { name: /ΒΙΟ Λάρισα 1/ }).click();
  await expect(page.getByLabel(/Αποθήκη αερίου/)).toHaveValue("8");
  await page.getByLabel("Καθεστώς στήριξης").selectOption("fit");
  await expect(page.getByText(/Με σταθερή τιμή \(FiT\)/)).toBeVisible();
  await page.getByLabel("Όνομα σταθμού").fill("ΒΙΟ Λάρισα 1 (νέο)");
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page.getByText("Ο σταθμός ενημερώθηκε.")).toBeVisible();
  await expect(page.getByRole("link", { name: /ΒΙΟ Λάρισα 1 \(νέο\)/ })).toContainText("Σταθερή τιμή");

  // Switch to English: same page, English UI.
  await page.getByRole("combobox", { name: "Γλώσσα" }).selectOption("en");
  await expect(page).toHaveURL(/\/en\/plants/);
  await expect(page.getByRole("heading", { name: "Plants" })).toBeVisible();

  // Delete with confirmation.
  await page.getByRole("link", { name: /ΒΙΟ Λάρισα 1 \(νέο\)/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("dialog")).toContainText("permanently deleted");
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Plant deleted.")).toBeVisible();
  await expect(page.getByText("No plants yet.")).toBeVisible();

  // Sign out; the chosen UI language (English) is remembered, protected pages redirect to login.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fdashboard$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("WrongPassword1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Wrong email or password.")).toBeVisible();
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  // Logging in continues in the profile's language (Greek, chosen at signup).
  await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Καλώς ήρθατε, Μαρία Παπαδοπούλου" })).toBeVisible();

  // Changing the profile language in settings switches the whole UI.
  await page.goto("/settings");
  await page.getByLabel("Γλώσσα", { exact: true }).selectOption("en");
  await page.getByRole("button", { name: "Αποθήκευση" }).first().click();
  await expect(page).toHaveURL(/\/en\/settings\?saved=1$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("Your changes were saved.")).toBeVisible();
});

test("password reset by email", async ({ page }) => {
  const email = uniqueEmail("reset");
  await signUpAndConfirm(page, { name: "Reset User", email });
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
  await page.getByLabel("Επιβεβαίωση κωδικού").fill("Mismatch2027xx");
  await page.getByRole("button", { name: "Αποθήκευση κωδικού" }).click();
  await expect(page.getByText("Οι κωδικοί δεν ταιριάζουν.")).toBeVisible();
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

test("users cannot open another organization's plant", async ({ browser }) => {
  const owner = await browser.newPage();
  await signUpAndConfirm(owner, { name: "Owner", email: uniqueEmail("owner") });
  await owner.goto("/plants/new");
  await owner.getByLabel("Όνομα σταθμού").fill("Private PV");
  await owner.getByLabel("Τύπος").selectOption("pv");
  await owner.getByLabel("Εγκατεστημένη ισχύς (MW)").fill("0.5");
  await owner.getByRole("button", { name: "Αποθήκευση" }).click();
  await owner.getByRole("link", { name: /Private PV/ }).click();
  await owner.waitForURL(/\/plants\/[0-9a-f-]{36}$/);
  const plantUrl = new URL(owner.url()).pathname;

  const intruder = await (await browser.newContext()).newPage();
  await signUpAndConfirm(intruder, { name: "Intruder", email: uniqueEmail("intruder") });
  await intruder.goto(plantUrl);
  // Rendered as a (streamed, noindex) not-found page; the other org's data never reaches the page.
  await expect(intruder.getByRole("heading", { name: "Η σελίδα δεν βρέθηκε" })).toBeVisible();
  await expect(intruder.getByText("Private PV")).toHaveCount(0);
  await intruder.goto("/plants");
  await expect(intruder.getByText("Δεν υπάρχουν σταθμοί ακόμη.")).toBeVisible();
});
