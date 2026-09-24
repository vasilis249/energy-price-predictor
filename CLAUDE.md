# CLAUDE.md

SaaS that forecasts Greek day-ahead electricity prices (HEnEx DAM, bidding zone GR) for renewable
plant owners, starting with biogas. Plan and milestones: README.md → "Roadmap".

## Layout

- `apps/web/`: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4, next-intl, Supabase SSR.
  - **Next 16 differs from older versions**: `middleware` is now `src/proxy.ts`, request APIs
    (`params`, `searchParams`, `cookies()`) are async. Read `apps/web/node_modules/next/dist/docs/`
    before using an unfamiliar API (see `apps/web/AGENTS.md`).
- `services/forecast/`: Python 3.12 (uv) FastAPI service, used for ingestion, models, optimizer and
  jobs from M2 on.
- `supabase/`: `config.toml`, SQL migrations, bilingual auth email templates, `testing/auth_shim.sql`.
- `infra/`: docker compose for non-Supabase services.
- `scripts/db-apply-plain.sh`: applies the shim and migrations to plain Postgres (RLS tests without Docker).

## Commands (repo root unless noted)

```bash
pnpm install
supabase start                      # local Postgres/Auth/REST + Mailpit (http://127.0.0.1:54324)
supabase db reset                   # re-apply migrations + seed
pnpm dev                            # web on http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test   # eslint, tsc, vitest unit tests
pnpm test:db                        # RLS integration tests (TEST_DATABASE_URL, default Supabase local)
pnpm e2e                            # Playwright (needs supabase start; starts `next dev` itself)
pnpm --filter web db:types          # regenerate src/lib/supabase/database.types.ts after migrations
cd services/forecast && uv run pytest && uv run ruff check . && uv run ruff format --check .
```

## Conventions

- **Time**: store `timestamptz` in UTC; display in `Europe/Athens` (next-intl `timeZone`). Market data
  keeps its native resolution as `(delivery_start, resolution_minutes)`: 15-min from 2025-10-01,
  hourly before. DST days have 92/100 quarter-hours.
- **Tenancy**: every org-scoped table has `org_id` (or reaches it through a parent) and RLS via
  `public.is_org_member()` / `is_org_owner()`. Grant column-level privileges explicitly; `anon` gets
  nothing. Add RLS tests in `apps/web/tests/db/` for every new table, including cross-org denial.
- **Data access in web**: server-only modules in `src/server/*` use the user-scoped client from
  `src/lib/supabase/server.ts`, so queries go through RLS. Never use a service/secret key in the web app
  for user data. Multi-row writes that must be atomic go into a `SECURITY INVOKER` SQL function (see
  `save_plant`).
- **Plan gating** (from M5) happens server-side in `src/server/entitlements.ts`, never only in the UI.
- **Validation**: zod schemas in `src/lib/validation/*` are shared by forms and server actions.
  Error messages are i18n keys under `validation.*`. Accept Greek decimal commas (`1,5`).
  Python uses pydantic.
- **Forms**: server actions return `ActionState` (`src/lib/action-state.ts`), and clients use
  `useFormAction` (keeps input on error; no auto-reset). Use `return redirect(...)` from
  `@/i18n/navigation` in actions. When redirecting into a different locale, call `persistLocale()` first.
- **i18n**: Greek is the default (no URL prefix), English is under `/en`. Every string goes in
  `apps/web/messages/{el,en}.json`, and both files must have identical keys (a unit test enforces
  this). Use `Link`/`redirect`/`useRouter` from `@/i18n/navigation`, not `next/*`.
- **UI**: mobile-first; native `<select>` for dropdowns; components in `src/components/ui` follow the
  shadcn pattern (Tailwind tokens in `globals.css`).
- **Migrations**: new timestamped file per change once a migration has been deployed; after changing
  schema, regenerate or update `database.types.ts`.
- **Forecasting (M2+)**: never leak future data. Features take an `as_of` cutoff and only use rows with
  `issued_at <= as_of`. Jobs must be idempotent (upserts on natural keys), logged in `job_runs`, and
  retried. When data is missing, fall back to the baseline and flag it.
- **Secrets**: only in env vars, documented in `.env.example`. Never commit `.env*`.
- Forecasts are estimates, not advice. Keep the disclaimer visible in footer and legal pages.
