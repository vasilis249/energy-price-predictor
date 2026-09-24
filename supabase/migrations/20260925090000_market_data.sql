-- M2: market data, forecasts and job bookkeeping.
--
-- Everything lives in the `market` schema, which is NOT exposed through the Supabase Data API
-- (config.toml [api].schemas) and gets no grants for anon/authenticated. The forecast service
-- writes here over a direct Postgres connection. The web app will read forecasts in M3 through
-- purpose-built functions that apply plan entitlements.
--
-- Time convention: every timestamp is timestamptz (UTC). Values are keyed by the start of their
-- delivery interval plus its length (`resolution_minutes`): 15 for the quarter-hour market time unit
-- used since 2025-10-01, 60 for older hourly data. `issued_at` records when a value became known,
-- which lets features and backtests only use information available at forecast time.

create schema market;
comment on schema market is 'Market data, forecasts and job runs. Service-only; not exposed via the Data API.';

revoke all on schema market from public;

-- Role the forecast service runs as. NOLOGIN: create a login role that is a member of it
-- (see README "Forecast service database access"). Local development may simply use `postgres`.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'forecast_service') then
    create role forecast_service nologin;
  end if;
end
$$;
grant usage on schema market to forecast_service;

-- ---------------------------------------------------------------------------
-- Day-ahead clearing prices (HEnEx DAM, ENTSO-E A44), one row per MTU per source.
-- ---------------------------------------------------------------------------
create table market.prices (
  zone text not null,                                   -- bidding zone, e.g. 'GR', 'BG', 'IT-SUD'
  delivery_start timestamptz not null,
  resolution_minutes smallint not null check (resolution_minutes in (15, 30, 60)),
  price_eur_mwh numeric(10, 3) not null,
  source text not null,                                 -- 'henex' | 'entsoe'
  source_version smallint,                              -- e.g. HEnEx file version (v01, v02, ...)
  published_at timestamptz,                             -- when the source published it, if known
  ingested_at timestamptz not null default now(),
  primary key (zone, source, delivery_start, resolution_minutes),
  check (extract(epoch from delivery_start)::bigint % (resolution_minutes * 60) = 0)
);
create index prices_zone_start_idx on market.prices (zone, delivery_start);

-- ---------------------------------------------------------------------------
-- Other time series (load / wind / solar forecasts and actuals, flows, carbon, gas).
-- ---------------------------------------------------------------------------
create table market.series (
  id serial primary key,
  source text not null,                                 -- 'ipto' | 'entsoe' | 'eex' | ...
  kind text not null,                                   -- 'load', 'wind', 'solar', 'res', 'flow', 'eua', ...
  horizon text not null check (horizon in ('actual', 'intraday', 'day_ahead', 'week_ahead', 'price')),
  zone text not null,                                   -- zone or border ('GR', 'GR>BG'), or 'EU' for EUA
  unit text not null,                                   -- 'MW', 'EUR/t', 'EUR/MWh'
  description text,
  unique (source, kind, horizon, zone)
);

create table market.series_values (
  series_id integer not null references market.series (id) on delete cascade,
  delivery_start timestamptz not null,
  resolution_minutes smallint not null check (resolution_minutes in (15, 30, 60, 1440)),
  issued_at timestamptz not null,                       -- when this value became available
  value double precision not null,
  source_version smallint,
  ingested_at timestamptz not null default now(),
  primary key (series_id, delivery_start, resolution_minutes, issued_at)
);
create index series_values_lookup_idx on market.series_values (series_id, delivery_start, issued_at desc);

-- ---------------------------------------------------------------------------
-- Models and forecasts
-- ---------------------------------------------------------------------------
create table market.model_versions (
  id serial primary key,
  name text not null,                                   -- 'seasonal_naive', 'lgbm_quantile', ...
  version text not null,                                -- semver or training timestamp
  kind text not null check (kind in ('baseline', 'ml')),
  params jsonb not null default '{}'::jsonb,
  trained_from timestamptz,
  trained_to timestamptz,
  metrics jsonb not null default '{}'::jsonb,           -- backtest metrics
  git_sha text,
  is_active boolean not null default false,             -- the model the product publishes
  created_at timestamptz not null default now(),
  unique (name, version)
);
create unique index model_versions_one_active_idx on market.model_versions (is_active) where is_active;

create table market.forecast_runs (
  id bigserial primary key,
  zone text not null,
  model_version_id integer not null references market.model_versions (id),
  issued_at timestamptz not null,                       -- information cutoff: only data known by now was used
  target_start timestamptz not null,
  target_end timestamptz not null,
  status text not null default 'succeeded' check (status in ('succeeded', 'failed')),
  is_fallback boolean not null default false,           -- produced by the baseline because inputs were missing
  fallback_reason text,
  inputs jsonb not null default '{}'::jsonb,            -- input completeness, data vintages used
  created_at timestamptz not null default now(),
  unique (zone, model_version_id, issued_at),
  check (target_end > target_start)
);
create index forecast_runs_zone_issued_idx on market.forecast_runs (zone, issued_at desc);

create table market.forecast_values (
  run_id bigint not null references market.forecast_runs (id) on delete cascade,
  delivery_start timestamptz not null,
  resolution_minutes smallint not null check (resolution_minutes in (15, 60)),
  p10 double precision not null,
  p50 double precision not null,
  p90 double precision not null,
  primary key (run_id, delivery_start),
  check (p10 <= p50 and p50 <= p90)
);

-- Accuracy of each run against actual prices, per horizon day (1 = next day).
create table market.forecast_evaluations (
  run_id bigint not null references market.forecast_runs (id) on delete cascade,
  horizon_day smallint not null check (horizon_day between 1 and 14),
  n integer not null check (n > 0),
  mae double precision not null,
  rmse double precision not null,
  bias double precision not null,                       -- mean(forecast - actual)
  coverage_p10_p90 double precision not null,           -- share of actuals inside [p10, p90]
  pinball double precision not null,                    -- mean pinball loss over p10/p50/p90
  evaluated_at timestamptz not null default now(),
  primary key (run_id, horizon_day)
);

-- ---------------------------------------------------------------------------
-- Job bookkeeping: one row per attempt of a scheduled/manual job.
-- ---------------------------------------------------------------------------
create table market.job_runs (
  id bigserial primary key,
  job text not null,                                    -- 'ingest_henex_prices', 'forecast_baseline', ...
  target_key text not null,                             -- what it ran for, e.g. delivery date '2026-09-25'
  status text not null check (status in ('running', 'succeeded', 'failed', 'skipped')),
  attempt smallint not null default 1,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_written integer,
  message text,
  details jsonb not null default '{}'::jsonb
);
create index job_runs_job_target_idx on market.job_runs (job, target_key, started_at desc);
create index job_runs_failed_idx on market.job_runs (started_at desc) where status = 'failed';

-- ---------------------------------------------------------------------------
-- Privileges: the service role only. anon/authenticated get nothing (not even schema usage).
-- ---------------------------------------------------------------------------
revoke all on schema market from anon, authenticated;
revoke all on all tables in schema market from public, anon, authenticated;
revoke all on all sequences in schema market from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema market to forecast_service;
grant usage, select on all sequences in schema market to forecast_service;
