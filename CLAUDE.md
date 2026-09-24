# CLAUDE.md

**BioFeed Market** (working name): a marketplace for biogas feedstock in Greece. Sellers (livestock farms,
dairies, olive mills, food producers) list residues and waste; buyers (biogas plants) find them, agree
supply contracts, record deliveries and pay through the platform (commission per payment).
The plan and milestones are in README.md → "Roadmap".

## Layout

- `apps/web/`: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4, next-intl, Supabase SSR.
  - **Next 16 differs from older versions**: `middleware` is now `src/proxy.ts`, and request APIs
    (`params`, `searchParams`, `cookies()`) are async. Read `apps/web/node_modules/next/dist/docs/`
    before using an unfamiliar API (see `apps/web/AGENTS.md`).
- `supabase/`: `config.toml`, SQL migrations, bilingual auth email templates, `testing/auth_shim.sql`.
- `services/forecast/`: dormant Python service from the earlier electricity-price concept. It isn't
  part of the marketplace MVP; the forecasting work is parked on branch `claude/forecasting-m2-parked`.
- `infra/`: docker compose for non-Supabase services. `scripts/db-apply-plain.sh` applies the shim and
  migrations to plain Postgres (RLS tests without Docker).

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
```

## Domain

- **Organizations** have one `market_role` (`buyer` | `seller`), chosen at signup (or on `/onboarding`
  for Google sign-ins) and never changed. Company details (legal name, ΑΦΜ with check digit, phone) are
  required before using the app. **Verification** (`pending`/`verified`/`rejected`) is set only by
  platform admins through `admin_set_verification()`. Changing legal name or ΑΦΜ resets it to pending.
- **Sites** are an organization's locations (farm, plant). Exact coordinates are private to the
  organization; other users only ever get an approximate location.
- **Feedstock catalog** (`feedstock_types`) is public reference data with indicative dry matter and
  biogas yield, EWC (ΕΚΑ) codes and animal by-product categories.
- **Listings** (sellers only): `draft → active ↔ paused → closed`. Status changes go through
  `set_listing_status()`; only verified sellers can publish, and closed is final. Sites used by a
  listing can't be deleted.
- **Buyers never read `listings` directly.** They use `search_listings(site, …)` from one of their own
  sites, which returns only active listings of verified sellers, a ~5 km grid location
  (`round(x*20)/20`) and a distance rounded to 5 km. Keep new buyer-facing reads to the same rule.
- **Prices** can be negative: a gate fee paid by the seller. Money direction follows the sign.
- Compliance (waste and animal by-product rules, invoices/myDATA, DAC7) is the parties' responsibility
  in the terms, but the platform records the relevant document numbers.

## Conventions

- **Time**: store `timestamptz` in UTC; display in `Europe/Athens` (next-intl `timeZone`).
- **Tenancy/RLS**: every org-scoped table has `org_id` (or reaches it through a parent) and RLS via
  `public.is_org_member()` / `is_org_owner()`. Grant column-level privileges explicitly; `anon` gets
  nothing except public reference data. Add RLS tests in `apps/web/tests/db/` for every new table and
  function, including cross-org denial.
- **State changes** that involve rules (publishing, offers, accepting, deliveries) go through SQL
  functions that check role, ownership and verification, not through direct table updates from the app.
- **Data access in web**: server-only modules in `src/server/*` use the user-scoped client from
  `src/lib/supabase/server.ts`, so queries go through RLS, and **throw** on query errors (never treat a
  failed query as "no data"). The only exception, from the payments milestone on, is
  `src/server/system/*` (webhooks, payments, cron), which may use the Supabase secret key and Stripe
  secret. Nothing else may.
- **Validation**: zod schemas in `src/lib/validation/*` are shared by forms and server actions. Error
  messages are i18n keys under `validation.*`. Accept Greek decimal commas (`1,5`), ΑΦΜ with `EL`
  prefix and spaces, and Greek phone formats.
- **Forms**: server actions return `ActionState` (`src/lib/action-state.ts`), and clients use
  `useFormAction` (keeps input on error; no auto-reset). Use `return redirect(...)` from
  `@/i18n/navigation` in actions. When redirecting into a different locale, call `persistLocale()` first.
- **i18n**: Greek is the default (no URL prefix), English is under `/en`. Every string goes in
  `apps/web/messages/{el,en}.json`, and both files must have identical keys (a unit test enforces
  this). Use `Link`/`redirect`/`useRouter` from `@/i18n/navigation`, not `next/*`.
- **UI**: mobile-first, for non-technical users (farmers): large tap targets, native `<select>`,
  plain Greek. Maps use Leaflet via `src/components/map/*`, loaded client-side only; the tile URL
  comes from env.
- **Migrations**: new timestamped file per change; after changing schema, update `database.types.ts`.
- **Secrets**: only in env vars, documented in `.env.example`. Never commit `.env*`.
