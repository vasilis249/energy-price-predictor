import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AFM, asUser, createUser, deleteUsers, pool, type TestUser } from "./helpers";

let seller: TestUser;
let unverifiedSeller: TestUser;
let buyer: TestUser;
let otherBuyer: TestUser;
let sellerSite: string;
let unverifiedSite: string;
let buyerSite: string;
let otherBuyerSite: string;

async function site(user: TestUser, lat: number, lon: number, name = "Site") {
  const { rows } = await pool.query(
    "insert into public.sites (org_id, name, site_type, municipality, latitude, longitude) values ($1, $2, 'other', 'Δήμος Τεστ', $3, $4) returning id",
    [user.orgId, name, lat, lon],
  );
  return rows[0].id as string;
}

async function verify(user: TestUser, vat: string) {
  await pool.query(
    "update public.organizations set verification_status = 'verified', legal_name = 'X', vat_number = $2, phone = '+302101234567' where id = $1",
    [user.orgId, vat],
  );
}

const listing = (orgId: string, siteId: string, over: Record<string, unknown> = {}) => ({
  org_id: orgId,
  site_id: siteId,
  feedstock_code: "cattle_slurry",
  title: "Υγρή κοπριά 60 αγελάδων",
  unit: "m3",
  quantity: 120,
  quantity_period: "month",
  available_from: "2026-01-01",
  price_per_unit: -2.5,
  ...over,
});

async function insertListing(user: TestUser, values: Record<string, unknown>) {
  return asUser(user, async (db) => {
    const cols = Object.keys(values);
    const { rows } = await db.query(
      `insert into public.listings (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
      Object.values(values),
    );
    return rows[0].id as string;
  });
}

/** Insert and keep (asUser rolls back), as the admin connection. */
async function seedListing(values: Record<string, unknown>, status = "active") {
  const cols = Object.keys(values);
  const { rows } = await pool.query(
    `insert into public.listings (${cols.join(", ")}, status, published_at) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}, $${cols.length + 1}, now()) returning id`,
    [...Object.values(values), status],
  );
  return rows[0].id as string;
}

beforeAll(async () => {
  seller = await createUser({ full_name: "Seller", market_role: "seller" });
  unverifiedSeller = await createUser({ full_name: "Unverified", market_role: "seller" });
  buyer = await createUser({ full_name: "Buyer", market_role: "buyer" });
  otherBuyer = await createUser({ full_name: "Other buyer", market_role: "buyer" });
  await verify(seller, AFM.a);
  sellerSite = await site(seller, 39.6391, 22.4191, "Exact farm"); // Larissa
  unverifiedSite = await site(unverifiedSeller, 39.64, 22.42);
  buyerSite = await site(buyer, 39.3667, 22.95, "Plant"); // ~55 km away
  otherBuyerSite = await site(otherBuyer, 40.64, 22.94);
});

afterAll(async () => {
  await pool.query("delete from public.listings where org_id = any($1::uuid[])", [
    [seller.orgId, unverifiedSeller.orgId],
  ]);
  await deleteUsers([seller, unverifiedSeller, buyer, otherBuyer]);
  await pool.end();
});

describe("creating listings", () => {
  it("lets sellers create drafts on their own sites, including gate fees", async () => {
    const id = await insertListing(seller, listing(seller.orgId, sellerSite));
    expect(id).toBeTruthy();
  });

  it("rejects listings on another organization's site or by buyers", async () => {
    await expect(insertListing(seller, listing(seller.orgId, buyerSite))).rejects.toThrow(/row-level security/);
    await expect(insertListing(buyer, listing(buyer.orgId, buyerSite))).rejects.toThrow(/row-level security/);
    await expect(insertListing(seller, listing(buyer.orgId, buyerSite))).rejects.toThrow(/row-level security/);
  });

  it("validates values", async () => {
    await expect(insertListing(seller, listing(seller.orgId, sellerSite, { quantity: 0 }))).rejects.toThrow(
      /check constraint/,
    );
    await expect(
      insertListing(seller, listing(seller.orgId, sellerSite, { available_until: "2025-12-31" })),
    ).rejects.toThrow(/check constraint/);
  });

  it("does not let sellers set the status directly", async () => {
    await expect(insertListing(seller, { ...listing(seller.orgId, sellerSite), status: "active" })).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("publishing", () => {
  it("only verified sellers can publish; closed is final", async () => {
    const draft = await seedListing(listing(seller.orgId, sellerSite), "draft");
    await asUser(seller, async (db) => {
      await db.query("select public.set_listing_status($1, 'active')", [draft]);
      const { rows } = await db.query("select status, published_at from public.listings where id = $1", [draft]);
      expect(rows[0].status).toBe("active");
      expect(rows[0].published_at).not.toBeNull();
      await db.query("select public.set_listing_status($1, 'paused')", [draft]);
      await db.query("select public.set_listing_status($1, 'closed')", [draft]);
      await expect(db.query("select public.set_listing_status($1, 'active')", [draft])).rejects.toThrow(/closed/);
    });

    const unverified = await seedListing(listing(unverifiedSeller.orgId, unverifiedSite), "draft");
    await expect(
      asUser(unverifiedSeller, (db) => db.query("select public.set_listing_status($1, 'active')", [unverified])),
    ).rejects.toThrow(/only verified sellers/);
  });

  it("does not let other organizations change a listing's status", async () => {
    const id = await seedListing(listing(seller.orgId, sellerSite), "draft");
    await expect(
      asUser(buyer, (db) => db.query("select public.set_listing_status($1, 'closed')", [id])),
    ).rejects.toThrow(/not found/);
  });

  it("only drafts can be deleted", async () => {
    const active = await seedListing(listing(seller.orgId, sellerSite));
    await asUser(seller, async (db) => {
      expect((await db.query("delete from public.listings where id = $1", [active])).rowCount).toBe(0);
    });
  });
});

describe("buyer access", () => {
  it("buyers can't read the listings table directly", async () => {
    await seedListing(listing(seller.orgId, sellerSite));
    await asUser(buyer, async (db) => {
      expect((await db.query("select id from public.listings")).rowCount).toBe(0);
    });
  });

  it("search returns active listings of verified sellers with approximate location and rounded distance", async () => {
    const active = await seedListing(listing(seller.orgId, sellerSite, { title: "Active slurry" }));
    await seedListing(listing(seller.orgId, sellerSite, { title: "Draft slurry" }), "draft");
    await seedListing(listing(unverifiedSeller.orgId, unverifiedSite, { title: "Unverified slurry" }));

    const { rows } = await asUser(buyer, (db) =>
      db.query("select * from public.search_listings($1) where title like '%slurry'", [buyerSite]),
    );
    expect(rows.map((r) => r.title)).toEqual(["Active slurry"]);
    const hit = rows[0];
    expect(hit.listing_id).toBe(active);
    expect(hit.seller_name).toBe("Seller");
    // Exact site is 39.6391, 22.4191: only the ~5 km grid cell is revealed.
    expect(Number(hit.approx_lat)).toBe(39.65);
    expect(Number(hit.approx_lon)).toBe(22.4);
    expect(hit.distance_km % 5).toBe(0);
    expect(hit.distance_km).toBeGreaterThanOrEqual(45);
    expect(hit.distance_km).toBeLessThanOrEqual(60);
    expect(Object.keys(hit)).not.toContain("site_id");
  });

  it("filters by distance, type and price direction", async () => {
    await seedListing(
      listing(seller.orgId, sellerSite, { title: "Whey paid", feedstock_code: "cheese_whey", price_per_unit: 3 }),
    );
    const q = (sql: string, params: unknown[]) => asUser(buyer, (db) => db.query(sql, params));
    const titles = async (sql: string, params: unknown[]) => (await q(sql, params)).rows.map((r) => r.title);

    expect(await titles("select title from public.search_listings($1, $2)", [buyerSite, ["cheese_whey"]])).toEqual([
      "Whey paid",
    ]);
    expect(await titles("select title from public.search_listings($1, null, 20)", [buyerSite])).toEqual([]);
    expect(await titles("select title from public.search_listings($1, null, 100, 'paid')", [buyerSite])).toEqual([
      "Whey paid",
    ]);
    expect(
      (await titles("select title from public.search_listings($1, null, 100, 'gate_fee')", [buyerSite])).includes(
        "Whey paid",
      ),
    ).toBe(false);
  });

  it("only works from the caller's own site, and only for buyers", async () => {
    await expect(
      asUser(buyer, (db) => db.query("select * from public.search_listings($1)", [otherBuyerSite])),
    ).rejects.toThrow(/buyers from one of their own sites/);
    await expect(
      asUser(seller, (db) => db.query("select * from public.search_listings($1)", [sellerSite])),
    ).rejects.toThrow(/buyers from one of their own sites/);
    await expect(
      asUser(null, (db) => db.query("select * from public.search_listings($1)", [buyerSite])),
    ).rejects.toThrow(/permission denied/);
  });

  it("a paused listing disappears from search", async () => {
    const id = await seedListing(listing(seller.orgId, sellerSite, { title: "Soon paused" }));
    await pool.query("update public.listings set status = 'paused' where id = $1", [id]);
    const { rows } = await asUser(buyer, (db) =>
      db.query("select * from public.search_listings($1, null, null, null, $2)", [buyerSite, id]),
    );
    expect(rows).toEqual([]);
  });
});

describe("sites with listings", () => {
  it("can't be deleted while listings use them", async () => {
    await seedListing(listing(seller.orgId, sellerSite));
    await expect(
      asUser(seller, (db) => db.query("delete from public.sites where id = $1", [sellerSite])),
    ).rejects.toThrow(/foreign key/);
  });
});
