# BioFeed Market

A marketplace for biogas feedstock in Greece (working name). **Sellers** (livestock farms, dairies,
olive mills, food producers, farmers) list manure, whey, olive mill wastewater and other residues.
**Buyers** (biogas plants) find them nearby, agree supply contracts, record weighed deliveries and pay
through the platform. The platform earns a commission per payment. Greek (default) and English.

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    U[Plant owner<br/>phone / desktop]
  end
  subgraph Web["apps/web: Next.js 16"]
    P[proxy.ts<br/>i18n + session refresh]
    RSC[Server components<br/>+ server actions]
  end
  subgraph Supabase
    AUTH[Auth<br/>email/password, Google]
    DB[(Postgres<br/>RLS per organization)]
  end
  STRIPE[Stripe Connect<br/>payments, payouts]
  MAP[Map tiles]

  U --> P --> RSC
  RSC -- user JWT --> DB
  RSC --> AUTH
  RSC -. milestone 4 .-> STRIPE
  U --> MAP
```

- **Web** (`apps/web`) renders everything server-side. All user-data queries use the signed-in
  user's session, so Postgres Row Level Security guarantees one organization never sees another's data.
- **Supabase** provides Postgres and Auth: email verification, password reset and optional Google login.
- Sellers' exact site locations stay private; other users only ever see an approximate location.
- All times are stored in UTC and shown in Europe/Athens.
- `services/forecast` is a dormant Python service from the project's earlier electricity-price concept.

## Run it locally

Prerequisites: Node 22 + pnpm 10, Docker, [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started),
[uv](https://docs.astral.sh/uv/) (for the Python service).

```bash
pnpm install
supabase start                         # first run pulls Docker images (a few minutes)
supabase status -o env                 # shows API_URL and PUBLISHABLE_KEY / ANON_KEY
cp .env.example apps/web/.env.local    # fill NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from the line above
pnpm dev                               # http://localhost:3000
```

- Sign up at http://localhost:3000/signup. The confirmation email arrives in **Mailpit** at
  http://127.0.0.1:54324.
- Supabase Studio (database browser) is disabled by default to keep Docker light; set `[studio] enabled = true` in `supabase/config.toml` to use it at http://127.0.0.1:54323
- **Make yourself a platform admin** (to verify businesses at `/admin`): in the SQL editor (Supabase
  dashboard) or `psql`, run
  `update public.profiles set is_platform_admin = true where id = (select id from auth.users where email = 'you@example.com');`

### Tests

```bash
pnpm lint && pnpm typecheck && pnpm test   # unit tests (validation, translations, consent)
pnpm test:db                               # RLS tests against Supabase local Postgres
pnpm e2e                                   # Playwright: seller/buyer signup → onboarding → sites on the map, admin verification, reset, isolation
```

Without Docker, RLS tests can run on any plain Postgres:
`scripts/db-apply-plain.sh postgresql://postgres:postgres@127.0.0.1:5432/postgres epp_test`, then
`TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/epp_test pnpm test:db`.

## Deploying auth (production Supabase project)

1. Create a project in an EU region (e.g. Frankfurt) and run `supabase link` + `supabase db push`.
2. Authentication → URL configuration: Site URL = your domain; add `https://<domain>/**` to redirect URLs.
3. Authentication → Email templates: paste `supabase/templates/confirmation.html` ("Confirm signup") and
   `recovery.html` ("Reset password"), with the subjects from `supabase/config.toml`.
4. Configure custom SMTP (e.g. Resend), because the built-in sender is rate-limited.
5. Optional Google login: create an OAuth client in Google Cloud, enable the Google provider in
   Supabase, and set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

## Roadmap

1. ✅ Foundation: auth, organizations, i18n, CI
2. ✅ Marketplace foundation: buyer/seller roles, company details with ΑΦΜ, admin verification, sites
   on a map, public feedstock catalog
3. ✅ Listings and search: sellers publish feedstock (quantity, availability, price or gate fee); buyers
   search by type, distance and price, in a list or on a map, and see only an approximate location
4. Offers, counter-offers, messages and supply agreements, with email notifications
5. Deliveries (weighed quantity, documents) and payments: Stripe Connect, card/SEPA, commission, gate fees
6. Admin tools, reviews, GDPR export/deletion, deployment and monitoring

See `CLAUDE.md` for conventions.
