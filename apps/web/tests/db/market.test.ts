import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createUser, deleteUsers, pool, type TestUser } from "./helpers";

// The market schema (prices, forecasts, job runs) is service-only: users read forecasts through
// entitlement-checking functions (M3), never directly.
let user: TestUser;

beforeAll(async () => {
  user = await createUser({ full_name: "Market Tester" });
});

afterAll(async () => {
  await deleteUsers([user]);
  await pool.end();
});

const tables = [
  "prices",
  "series",
  "series_values",
  "model_versions",
  "forecast_runs",
  "forecast_values",
  "forecast_evaluations",
  "job_runs",
];

describe("market schema", () => {
  it.each(tables)("denies signed-in users access to market.%s", async (table) => {
    await expect(asUser(user, (db) => db.query(`select 1 from market.${table} limit 1`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it.each(tables)("denies anonymous access to market.%s", async (table) => {
    await expect(asUser(null, (db) => db.query(`select 1 from market.${table} limit 1`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("lets the forecast service role write prices", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role forecast_service");
      await client.query(
        `insert into market.prices (zone, delivery_start, resolution_minutes, price_eur_mwh, source)
         values ('GR', '2026-01-01T22:00:00Z', 15, 101.5, 'test')`,
      );
      const { rows } = await client.query("select price_eur_mwh from market.prices where source = 'test'");
      expect(rows).toEqual([{ price_eur_mwh: "101.500" }]);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });

  it("rejects prices not aligned to their resolution", async () => {
    await expect(
      pool.query(
        `insert into market.prices (zone, delivery_start, resolution_minutes, price_eur_mwh, source)
         values ('GR', '2026-01-01T22:05:00Z', 15, 1, 'test')`,
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("rejects crossed forecast quantiles", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const mv = await client.query(
        "insert into market.model_versions (name, version, kind) values ('t', 't', 'baseline') returning id",
      );
      const run = await client.query(
        `insert into market.forecast_runs (zone, model_version_id, issued_at, target_start, target_end)
         values ('GR', $1, now(), now(), now() + interval '1 day') returning id`,
        [mv.rows[0].id],
      );
      await expect(
        client.query(
          `insert into market.forecast_values (run_id, delivery_start, resolution_minutes, p10, p50, p90)
           values ($1, now(), 15, 50, 40, 60)`,
          [run.rows[0].id],
        ),
      ).rejects.toThrow(/check constraint/);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});
