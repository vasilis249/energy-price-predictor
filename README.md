# Energy Price Predictor

Subscription platform that forecasts wholesale electricity prices in Greece (HEnEx Day-Ahead
Market, bidding zone GR) for owners of renewable plants. It starts with biogas plants, which can
shift production into expensive hours. Greek (default) and English.

> Forecasts are estimates and are not investment or financial advice.

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
  subgraph Forecast["services/forecast: Python"]
    API[FastAPI<br/>optimizer, admin jobs]
    JOBS[Scheduled jobs<br/>ingest · forecast · evaluate · train]
  end
  SRC[(ENTSO-E · HEnEx · IPTO<br/>EEX · Open-Meteo)]

  U --> P --> RSC
  RSC -- user JWT --> DB
  RSC --> AUTH
  RSC -- internal API key --> API
  JOBS --> SRC
  JOBS --> DB
  API --> DB
```

- **Web** (`apps/web`) renders everything server-side. All user-data queries use the signed-in
  user's session, so Postgres Row Level Security guarantees one organization never sees another's data.
- **Supabase** provides Postgres and Auth: email verification, password reset and optional Google login.
- **Forecast service** (`services/forecast`) ingests market data, trains models, publishes forecasts
  and solves the production-scheduling MILP. In Milestone 1 it's a skeleton with a health endpoint.
- All times are stored in UTC and shown in Europe/Athens. Market data keeps its native resolution:
  15-minute since 1 Oct 2025, hourly before.

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
- Python service: `cd services/forecast && uv sync && uv run uvicorn forecast.api.app:app --reload`
  (or `docker compose -f infra/docker-compose.yml up --build`), then http://localhost:8000/health

### Tests

```bash
pnpm lint && pnpm typecheck && pnpm test   # unit tests (validation, translations, consent)
pnpm test:db                               # RLS tests against Supabase local Postgres
pnpm e2e                                   # Playwright: signup → email → plants → language → login, reset, isolation
cd services/forecast && uv run pytest
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

1. ✅ Project setup, auth, organizations, plant profiles, i18n
2. Data ingestion (ENTSO-E, HEnEx, IPTO, EEX) + historical database + baseline forecast
3. Dashboard (forecast bands, actuals, heatmap) + public accuracy page
4. LightGBM quantile model with walk-forward backtesting
5. Stripe subscriptions (trial, Tax, portal) + server-side plan gating
6. Production-scheduling optimizer (MILP) + alerts
7. Admin panel, deployment, monitoring, GDPR export/deletion

See `CLAUDE.md` for conventions.
