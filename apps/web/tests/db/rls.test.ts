import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AFM, asUser, createUser, deleteUsers, insertSite, makeAdmin, pool, type TestUser } from "./helpers";

let alice: TestUser; // seller, chose role at signup
let bob: TestUser; // buyer
let carol: TestUser; // no role yet (e.g. Google sign-in)
let admin: TestUser;
let bobSiteId: string;

beforeAll(async () => {
  alice = await createUser({ full_name: "Alice", org_name: "Alice Farm", locale: "en", market_role: "seller" });
  bob = await createUser({ full_name: "Bob", market_role: "buyer" });
  carol = await createUser({ full_name: "Carol", market_role: "admin" });
  admin = await createUser({ full_name: "Admin" });
  await makeAdmin(admin);
  bobSiteId = await insertSite(bob.orgId, "Bob biogas plant");
});

afterAll(async () => {
  await deleteUsers([alice, bob, carol, admin]);
  await pool.end();
});

describe("signup trigger", () => {
  it("creates a profile, an organization with the chosen marketplace role and an owner membership", async () => {
    const { rows: profile } = await pool.query("select full_name, locale from public.profiles where id = $1", [
      alice.id,
    ]);
    expect(profile[0]).toEqual({ full_name: "Alice", locale: "en" });
    const { rows } = await pool.query(
      `select o.name, o.market_role, o.verification_status, m.role
       from public.organizations o join public.memberships m on m.org_id = o.id where m.user_id = $1`,
      [alice.id],
    );
    expect(rows).toEqual([
      { name: "Alice Farm", market_role: "seller", verification_status: "pending", role: "owner" },
    ]);
  });

  it("ignores invalid roles from signup metadata", async () => {
    const { rows } = await pool.query("select market_role from public.organizations where id = $1", [carol.orgId]);
    expect(rows[0].market_role).toBeNull();
  });
});

describe("tenant isolation", () => {
  it("only shows the user's own profile, organization and memberships", async () => {
    await asUser(alice, async (db) => {
      expect((await db.query("select id from public.profiles")).rows.map((r) => r.id)).toEqual([alice.id]);
      expect((await db.query("select id from public.organizations")).rows.map((r) => r.id)).toEqual([alice.orgId]);
      expect((await db.query("select user_id from public.memberships")).rows.map((r) => r.user_id)).toEqual([alice.id]);
    });
  });

  it("keeps other organizations' sites (exact locations) private", async () => {
    await asUser(alice, async (db) => {
      expect((await db.query("select id from public.sites")).rowCount).toBe(0);
      expect((await db.query("update public.sites set name = 'x' where id = $1", [bobSiteId])).rowCount).toBe(0);
      expect((await db.query("delete from public.sites where id = $1", [bobSiteId])).rowCount).toBe(0);
    });
    await expect(
      asUser(alice, (db) =>
        db.query(
          "insert into public.sites (org_id, name, site_type, latitude, longitude) values ($1, 'x', 'other', 39, 22)",
          [bob.orgId],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("lets members manage their own sites, within Greece", async () => {
    await asUser(bob, async (db) => {
      const { rows } = await db.query(
        `insert into public.sites (org_id, name, site_type, municipality, latitude, longitude)
         values ($1, 'Farsala plant', 'biogas_plant', 'Φαρσάλων', 39.29, 22.38) returning id`,
        [bob.orgId],
      );
      expect((await db.query("update public.sites set name = 'Renamed' where id = $1", [rows[0].id])).rowCount).toBe(1);
      expect((await db.query("delete from public.sites where id = $1", [rows[0].id])).rowCount).toBe(1);
    });
    await expect(
      asUser(bob, (db) =>
        db.query(
          "insert into public.sites (org_id, name, site_type, latitude, longitude) values ($1, 'Paris', 'other', 48.85, 2.35)",
          [bob.orgId],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("cannot move a site into another organization", async () => {
    await expect(
      asUser(bob, (db) => db.query("update public.sites set org_id = $1 where id = $2", [alice.orgId, bobSiteId])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("organization profile", () => {
  it("lets owners set company details and validates the VAT number (ΑΦΜ)", async () => {
    await asUser(alice, async (db) => {
      const ok = await db.query(
        "update public.organizations set legal_name = 'Alice Farm IKE', vat_number = $1, phone = '+30 2410 123456' where id = $2",
        [AFM.a, alice.orgId],
      );
      expect(ok.rowCount).toBe(1);
    });
    await expect(
      asUser(alice, (db) =>
        db.query("update public.organizations set vat_number = '123456789' where id = $1", [alice.orgId]),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("does not let users change their role, verification or payment fields", async () => {
    for (const column of ["market_role = 'buyer'", "verification_status = 'verified'", "payouts_enabled = true"]) {
      await expect(
        asUser(alice, (db) => db.query(`update public.organizations set ${column} where id = $1`, [alice.orgId])),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe("onboarding", () => {
  it("sets the role once for organizations without one", async () => {
    await asUser(carol, async (db) => {
      await db.query("select public.complete_onboarding('buyer', 'Carol Biogas AE', $1, '+302101234567')", [AFM.b]);
      const { rows } = await db.query("select market_role, legal_name, vat_number from public.organizations");
      expect(rows).toEqual([{ market_role: "buyer", legal_name: "Carol Biogas AE", vat_number: AFM.b }]);
    });
  });

  it("refuses to switch an existing role", async () => {
    await expect(
      asUser(alice, (db) => db.query("select public.complete_onboarding('buyer', 'X', $1, null)", [AFM.c])),
    ).rejects.toThrow(/cannot be changed/);
  });

  it("is not available anonymously", async () => {
    await expect(
      asUser(null, (db) => db.query("select public.complete_onboarding('buyer', 'X', $1, null)", [AFM.c])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("admin verification", () => {
  it("only admins can verify organizations and see all of them", async () => {
    await expect(
      asUser(alice, (db) => db.query("select public.admin_set_verification($1, 'verified')", [alice.orgId])),
    ).rejects.toThrow(/not allowed/);

    await asUser(admin, async (db) => {
      const { rows } = await db.query("select id from public.organizations where id = any($1::uuid[])", [
        [alice.orgId, bob.orgId],
      ]);
      expect(rows).toHaveLength(2);
      await db.query("select public.admin_set_verification($1, 'verified', 'ΑΦΜ checked')", [bob.orgId]);
      const org = await db.query("select verification_status, verified_at from public.organizations where id = $1", [
        bob.orgId,
      ]);
      expect(org.rows[0].verification_status).toBe("verified");
      expect(org.rows[0].verified_at).not.toBeNull();
    });
  });

  it("sends a verified organization back to pending when its legal identity changes", async () => {
    await pool.query(
      "update public.organizations set verification_status = 'verified', verified_at = now(), vat_number = $1 where id = $2",
      [AFM.c, bob.orgId],
    );
    await asUser(bob, async (db) => {
      const status = async () =>
        (await db.query("select verification_status from public.organizations where id = $1", [bob.orgId])).rows[0]
          .verification_status;
      await db.query("update public.organizations set phone = '+30 210 1111111' where id = $1", [bob.orgId]);
      expect(await status()).toBe("verified");
      await db.query("update public.organizations set legal_name = 'New name AE' where id = $1", [bob.orgId]);
      expect(await status()).toBe("pending");
    });
  });
});

describe("feedstock catalog", () => {
  it("is readable by everyone, including anonymous visitors, and writable by no one", async () => {
    const { rows } = await asUser(null, (db) =>
      db.query("select code from public.feedstock_types order by sort_order"),
    );
    expect(rows.length).toBeGreaterThan(10);
    expect(rows[0].code).toBe("cattle_slurry");
    await expect(
      asUser(alice, (db) => db.query("update public.feedstock_types set name_el = 'x' where code = 'other'")),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("privilege boundaries", () => {
  it("does not let users make themselves platform admins", async () => {
    await expect(
      asUser(alice, (db) => db.query("update public.profiles set is_platform_admin = true where id = $1", [alice.id])),
    ).rejects.toThrow(/permission denied/);
  });

  it("does not let users create organizations or memberships directly", async () => {
    await expect(
      asUser(alice, (db) => db.query("insert into public.organizations (name) values ('x')")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(alice, (db) =>
        db.query("insert into public.memberships (org_id, user_id, role) values ($1, $2, 'owner')", [
          bob.orgId,
          alice.id,
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("gives anonymous requests no access to private tables", async () => {
    for (const table of ["profiles", "organizations", "memberships", "sites"]) {
      await expect(asUser(null, (db) => db.query(`select 1 from public.${table}`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });
});
