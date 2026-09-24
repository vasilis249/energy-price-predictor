import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createUser, deleteUsers, insertPlant, pool, type TestUser } from "./helpers";

let alice: TestUser;
let bob: TestUser;
let bobPlantId: string;

beforeAll(async () => {
  alice = await createUser({ full_name: "Alice", org_name: "Alice Biogas", locale: "en" });
  bob = await createUser({ full_name: "Bob" });
  bobPlantId = await insertPlant(bob.orgId, "Bob plant");
  await pool.query(
    `insert into public.biogas_params (plant_id, avg_production_mw, gas_storage_hours, min_load_pct, max_load_mw, max_starts_per_day)
     values ($1, 0.8, 6, 40, 1.0, 2)`,
    [bobPlantId],
  );
});

afterAll(async () => {
  await deleteUsers([alice, bob]);
  await pool.end();
});

describe("signup trigger", () => {
  it("creates a profile, an organization and an owner membership from signup metadata", async () => {
    const { rows: profile } = await pool.query("select full_name, locale from public.profiles where id = $1", [
      alice.id,
    ]);
    expect(profile[0]).toEqual({ full_name: "Alice", locale: "en" });

    const { rows: org } = await pool.query(
      "select o.name, m.role from public.organizations o join public.memberships m on m.org_id = o.id where m.user_id = $1",
      [alice.id],
    );
    expect(org).toEqual([{ name: "Alice Biogas", role: "owner" }]);
  });

  it("defaults locale to Greek and names the org after the user", async () => {
    const { rows } = await pool.query(
      "select p.locale, o.name from public.profiles p join public.organizations o on o.created_by = p.id where p.id = $1",
      [bob.id],
    );
    expect(rows[0]).toEqual({ locale: "el", name: "Bob" });
  });
});

describe("tenant isolation", () => {
  it("only shows the user's own profile, organization and memberships", async () => {
    await asUser(alice, async (db) => {
      const profiles = await db.query("select id from public.profiles");
      expect(profiles.rows.map((r) => r.id)).toEqual([alice.id]);

      const orgs = await db.query("select id from public.organizations");
      expect(orgs.rows.map((r) => r.id)).toEqual([alice.orgId]);

      const memberships = await db.query("select user_id from public.memberships");
      expect(memberships.rows.map((r) => r.user_id)).toEqual([alice.id]);
    });
  });

  it("hides other organizations' plants and biogas parameters", async () => {
    await asUser(alice, async (db) => {
      expect((await db.query("select id from public.plants")).rowCount).toBe(0);
      expect((await db.query("select plant_id from public.biogas_params")).rowCount).toBe(0);
      expect((await db.query("select id from public.plants where id = $1", [bobPlantId])).rowCount).toBe(0);
    });
  });

  it("rejects inserting a plant into another organization", async () => {
    await expect(
      asUser(alice, (db) =>
        db.query("insert into public.plants (org_id, name, plant_type, capacity_mw) values ($1, 'x', 'pv', 1)", [
          bob.orgId,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot update or delete another organization's plant", async () => {
    await asUser(alice, async (db) => {
      const updated = await db.query("update public.plants set name = 'hacked' where id = $1", [bobPlantId]);
      expect(updated.rowCount).toBe(0);
      const deleted = await db.query("delete from public.plants where id = $1", [bobPlantId]);
      expect(deleted.rowCount).toBe(0);
    });
    const { rows } = await pool.query("select name from public.plants where id = $1", [bobPlantId]);
    expect(rows[0].name).toBe("Bob plant");
  });

  it("rejects biogas parameters for another organization's plant", async () => {
    const bobPlantWithoutParams = await insertPlant(bob.orgId, "Bob plant 2");
    await expect(
      asUser(alice, (db) =>
        db.query(
          `insert into public.biogas_params (plant_id, avg_production_mw, gas_storage_hours, min_load_pct, max_load_mw, max_starts_per_day)
           values ($1, 0.5, 1, 10, 1, 1)`,
          [bobPlantWithoutParams],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await pool.query("delete from public.plants where id = $1", [bobPlantWithoutParams]);
  });

  it("cannot move a plant into another organization", async () => {
    const alicePlant = await insertPlant(alice.orgId, "Alice plant");
    await expect(
      asUser(alice, (db) => db.query("update public.plants set org_id = $1 where id = $2", [bob.orgId, alicePlant])),
    ).rejects.toThrow(/permission denied/);
    await pool.query("delete from public.plants where id = $1", [alicePlant]);
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

  it("gives anonymous requests no access at all", async () => {
    for (const table of ["profiles", "organizations", "memberships", "plants", "biogas_params"]) {
      await expect(asUser(null, (db) => db.query(`select 1 from public.${table}`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });
});

describe("save_plant()", () => {
  const plant = { name: "Via RPC", plant_type: "biogas", capacity_mw: 2, support_scheme: "fip" };
  const biogas = {
    avg_production_mw: 1.5,
    gas_storage_hours: 6,
    min_load_pct: 40,
    max_load_mw: 2,
    max_starts_per_day: 2,
  };

  it("creates and updates a plant with biogas parameters atomically", async () => {
    await asUser(alice, async (db) => {
      const { rows } = await db.query("select public.save_plant($1, $2, $3) as id", [alice.orgId, plant, biogas]);
      const id = rows[0].id;
      const saved = await db.query(
        "select p.name, b.gas_storage_hours, b.min_up_hours from public.plants p join public.biogas_params b on b.plant_id = p.id where p.id = $1",
        [id],
      );
      expect(saved.rows[0]).toEqual({ name: "Via RPC", gas_storage_hours: "6.00", min_up_hours: "1.00" });

      // Switching to PV removes the biogas parameters.
      await db.query("select public.save_plant($1, $2, null, $3)", [alice.orgId, { ...plant, plant_type: "pv" }, id]);
      expect((await db.query("select 1 from public.biogas_params where plant_id = $1", [id])).rowCount).toBe(0);
    });
  });

  it("rolls back the plant when biogas parameters are invalid", async () => {
    await expect(
      asUser(alice, (db) =>
        db.query("select public.save_plant($1, $2, $3)", [alice.orgId, plant, { ...biogas, max_starts_per_day: 99 }]),
      ),
    ).rejects.toThrow(/check constraint/);
    const { rowCount } = await pool.query("select 1 from public.plants where org_id = $1 and name = 'Via RPC'", [
      alice.orgId,
    ]);
    expect(rowCount).toBe(0);
  });

  it("cannot create in or update plants of another organization", async () => {
    await expect(
      asUser(alice, (db) => db.query("select public.save_plant($1, $2)", [bob.orgId, plant])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(alice, (db) => db.query("select public.save_plant($1, $2, null, $3)", [alice.orgId, plant, bobPlantId])),
    ).rejects.toThrow(/not found/);
  });

  it("is not callable anonymously", async () => {
    await expect(
      asUser(null, (db) => db.query("select public.save_plant($1, $2)", [bob.orgId, plant])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("own data", () => {
  it("lets a member create, edit and delete plants with biogas parameters", async () => {
    await asUser(alice, async (db) => {
      const { rows } = await db.query(
        "insert into public.plants (org_id, name, plant_type, capacity_mw, support_scheme) values ($1, 'Mine', 'biogas', 1.5, 'fip') returning id",
        [alice.orgId],
      );
      const plantId = rows[0].id;
      await db.query(
        `insert into public.biogas_params (plant_id, avg_production_mw, gas_storage_hours, min_load_pct, max_load_mw, max_starts_per_day)
         values ($1, 1.0, 8, 50, 1.5, 3)`,
        [plantId],
      );
      const updated = await db.query("update public.biogas_params set gas_storage_hours = 10 where plant_id = $1", [
        plantId,
      ]);
      expect(updated.rowCount).toBe(1);
      const deleted = await db.query("delete from public.plants where id = $1", [plantId]);
      expect(deleted.rowCount).toBe(1);
      expect((await db.query("select 1 from public.biogas_params where plant_id = $1", [plantId])).rowCount).toBe(0);
    });
  });

  it("lets owners rename their organization and users edit their profile", async () => {
    await asUser(alice, async (db) => {
      expect(
        (await db.query("update public.organizations set name = 'Renamed' where id = $1", [alice.orgId])).rowCount,
      ).toBe(1);
      expect((await db.query("update public.profiles set locale = 'el' where id = $1", [alice.id])).rowCount).toBe(1);
    });
  });
});
