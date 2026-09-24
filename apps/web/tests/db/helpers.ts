import { randomUUID } from "node:crypto";
import pg from "pg";

// Supabase local by default; CI/sandboxes point this at plain Postgres prepared by scripts/db-apply-plain.sh.
export const DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });

export type TestUser = { id: string; email: string; orgId: string };

/** Insert an auth user as the admin connection; the signup trigger creates profile, org and membership. */
export async function createUser(meta: Record<string, string> = {}): Promise<TestUser> {
  const id = randomUUID();
  const email = `rls-${id}@example.test`;
  await pool.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    id,
    email,
    JSON.stringify(meta),
  ]);
  const { rows } = await pool.query("select org_id from public.memberships where user_id = $1", [id]);
  return { id, email, orgId: rows[0].org_id };
}

export async function deleteUsers(users: TestUser[]) {
  if (users.length === 0) return;
  const ids = users.map((u) => u.id);
  await pool.query("delete from public.organizations where created_by = any($1::uuid[])", [ids]);
  await pool.query("delete from auth.users where id = any($1::uuid[])", [ids]);
}

/**
 * Run `fn` inside a transaction as the given user, exactly like PostgREST does:
 * role `authenticated` (or `anon` when user is null) with the JWT claims set. Always rolled back.
 */
export async function asUser<T>(user: TestUser | null, fn: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (user) {
      const claims = JSON.stringify({ sub: user.id, role: "authenticated", email: user.email });
      await client.query("select set_config('request.jwt.claims', $1, true)", [claims]);
      await client.query("set local role authenticated");
    } else {
      await client.query("set local role anon");
    }
    return await fn(client);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

/** Seed a site directly as admin (bypasses RLS). */
export async function insertSite(orgId: string, name = "Site"): Promise<string> {
  const { rows } = await pool.query(
    "insert into public.sites (org_id, name, site_type, latitude, longitude) values ($1, $2, 'livestock_farm', 39.6, 22.4) returning id",
    [orgId, name],
  );
  return rows[0].id;
}

/** Make a user a platform admin (admin connection). */
export async function makeAdmin(user: TestUser) {
  await pool.query("update public.profiles set is_platform_admin = true where id = $1", [user.id]);
}

// Valid Greek VAT numbers (check digit OK).
export const AFM = { a: "090000045", b: "994645446", c: "123456783" };
