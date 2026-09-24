import { expect, type Page, test } from "@playwright/test";
import { signUpAndOnboard, sql, uniqueEmail } from "./helpers";

async function addSite(page: Page, name: string, lat: string, lon: string, municipality: string) {
  await page.goto("/sites/new");
  await page.getByLabel("Όνομα εγκατάστασης").fill(name);
  await page.getByLabel("Γεωγραφικό πλάτος").fill(lat);
  await page.getByLabel("Γεωγραφικό μήκος").fill(lon);
  await page.getByLabel(/Δήμος/).fill(municipality);
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page.getByText("Η εγκατάσταση προστέθηκε.")).toBeVisible();
}

test("seller lists feedstock with a gate fee, publishes after verification, buyer finds it nearby", async ({
  browser,
}) => {
  const run = Date.now() % 1_000_000;
  const legalName = `Βουστάσιο Αγιάς ${run} ΙΚΕ`;
  const title = `Υγρή κοπριά αγελάδων ${run}`;

  // Seller: site, then a draft listing. Unverified sellers can't publish yet.
  const seller = await browser.newPage();
  await signUpAndOnboard(seller, { name: "Πωλητής", email: uniqueEmail("lseller"), role: "seller", legalName });
  await seller.getByRole("link", { name: "Αγγελίες" }).first().click();
  await expect(seller.getByRole("heading", { name: "Οι αγγελίες μου" })).toBeVisible();
  await seller.goto("/listings/new");
  await expect(seller.getByText(/Πρώτα προσθέστε την εγκατάσταση/)).toBeVisible();
  await addSite(seller, "Βουστάσιο", "39,71", "22,75", "Δήμος Αγιάς");

  await seller.goto("/listings/new");
  await seller.getByLabel("Είδος πρώτης ύλης").selectOption("cattle_slurry");
  await seller.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(seller.getByText("Υποχρεωτικό πεδίο.").first()).toBeVisible();
  await seller.getByLabel("Τίτλος", { exact: true }).fill(title);
  await seller.getByLabel("Ποσότητα", { exact: true }).fill("120,5");
  await expect(seller.getByLabel("Μονάδα", { exact: true })).toHaveValue("m3"); // slurry defaults to m³
  await seller.getByRole("radio", { name: "Πληρώνω εγώ για να την παραλάβουν" }).check();
  await seller.getByLabel(/Ποσό \(€ ανά/).fill("3");
  await seller.getByLabel("Μεταφορά").selectOption("buyer_collects");
  await seller.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(seller).toHaveURL(/\/listings\/[0-9a-f-]{36}\?notice=created$/);
  await expect(seller.getByText(/Η αγγελία αποθηκεύτηκε ως πρόχειρο/)).toBeVisible();
  await expect(seller.getByText(/Θα μπορείτε να δημοσιεύσετε μόλις επαληθευτεί/)).toBeVisible();
  await expect(seller.getByRole("button", { name: "Δημοσίευση" })).toHaveCount(0);
  await expect(seller.getByText(/Ο πωλητής πληρώνει/).first()).toBeVisible();

  // The site can't be deleted while a listing uses it.
  await seller.goto("/sites");
  await seller.getByRole("link", { name: /Βουστάσιο/ }).click();
  await seller.getByRole("button", { name: "Διαγραφή" }).click();
  await seller.getByRole("dialog").getByRole("button", { name: "Διαγραφή" }).click();
  await expect(
    seller.getByText("Η εγκατάσταση χρησιμοποιείται σε αγγελίες και δεν μπορεί να διαγραφεί."),
  ).toBeVisible();

  // An admin verifies the business; now the listing can be published.
  await sql(
    "update public.organizations set verification_status = 'verified', verified_at = now() where legal_name = $1",
    [legalName],
  );
  await seller.goto("/listings");
  await seller.getByRole("link", { name: new RegExp(title) }).click();
  await seller.getByRole("button", { name: "Δημοσίευση" }).click();
  await expect(seller.getByText("Δημοσιευμένη").first()).toBeVisible();
  await expect(seller.getByRole("button", { name: "Παύση" })).toBeVisible();

  // Sellers don't search; buyers don't manage listings.
  await seller.goto("/search");
  await expect(seller.getByRole("heading", { name: "Η σελίδα δεν βρέθηκε" })).toBeVisible();

  // Buyer: needs a site first, then finds the listing ~30 km away, sorted by distance.
  const buyer = await (await browser.newContext()).newPage();
  await signUpAndOnboard(buyer, { name: "Αγοραστής", email: uniqueEmail("lbuyer"), role: "buyer" });
  await buyer.getByRole("link", { name: "Αναζήτηση" }).first().click();
  await expect(buyer.getByText(/Προσθέστε τη μονάδα σας για να αναζητήσετε/)).toBeVisible();
  await addSite(buyer, "Μονάδα Λάρισας", "39,64", "22,42", "Δήμος Λαρισαίων");

  await buyer.goto("/dashboard");
  await expect(buyer.getByText(/σε ακτίνα 50 χλμ από «Μονάδα Λάρισας»/)).toBeVisible();
  await buyer.goto("/search");
  const result = buyer.getByRole("link", { name: new RegExp(title) });
  await expect(result).toContainText("~30 χλμ");
  await expect(result).toContainText("Ο πωλητής πληρώνει");
  await expect(result).toContainText("Δήμος Αγιάς");

  // Filters: too close, or the wrong price direction, hides it.
  await buyer.getByLabel("Μέγιστη απόσταση").selectOption("25");
  await buyer.getByRole("button", { name: "Αναζήτηση" }).click();
  await expect(buyer).toHaveURL(/km=25/);
  await expect(buyer.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
  await buyer.getByLabel("Μέγιστη απόσταση").selectOption("50");
  await buyer.getByLabel("Τιμή", { exact: true }).selectOption("paid");
  await buyer.getByRole("button", { name: "Αναζήτηση" }).click();
  await expect(buyer).toHaveURL(/price=paid/);
  await expect(buyer.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
  await buyer.getByLabel("Τιμή", { exact: true }).selectOption("gate_fee");
  await buyer.getByLabel("Είδος", { exact: true }).selectOption("cattle_slurry");
  await buyer.getByRole("button", { name: "Αναζήτηση" }).click();
  await expect(buyer).toHaveURL(/price=gate_fee/);

  // Detail: approximate area only, estimate of biogas, verified seller.
  await buyer.getByRole("link", { name: new RegExp(title) }).click();
  await expect(buyer).toHaveURL(/\/search\/[0-9a-f-]{36}\?site=/);
  await expect(buyer.getByRole("heading", { name: title })).toBeVisible();
  await expect(buyer.getByText("Περιοχή: Δήμος Αγιάς · ~30 χλμ")).toBeVisible();
  await expect(buyer.getByText("Η ακριβής τοποθεσία γνωστοποιείται μετά τη συμφωνία.")).toBeVisible();
  await expect(buyer.getByText(/m³ βιοαερίου \/ μήνα/)).toBeVisible();
  await expect(buyer.getByText("Την παραλαμβάνει η μονάδα")).toBeVisible();
  await expect(buyer.getByLabel("Επαληθευμένος πωλητής")).toBeVisible();
  await expect(buyer.getByText("39.71")).toHaveCount(0);

  await buyer.goto("/listings");
  await expect(buyer.getByRole("heading", { name: "Η σελίδα δεν βρέθηκε" })).toBeVisible();

  // Paused listings disappear from search.
  await seller.goto("/listings");
  await seller.getByRole("link", { name: new RegExp(title) }).click();
  await seller.getByRole("button", { name: "Παύση" }).click();
  await expect(seller.getByText("Σε παύση").first()).toBeVisible();
  await buyer.goto("/search");
  await expect(buyer.getByRole("status").first()).toBeVisible();
  await expect(buyer.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
});
