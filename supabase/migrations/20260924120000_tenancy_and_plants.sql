-- M1: tenancy (profiles, organizations, memberships) and plant profiles.
-- Every org-scoped table has RLS; access is granted only through org membership.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_locale as enum ('el', 'en');
create type public.org_role as enum ('owner', 'member');
create type public.plant_type as enum ('biogas', 'pv', 'wind', 'small_hydro', 'other');
create type public.support_scheme as enum ('fit', 'fip', 'merchant', 'unknown');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  locale public.app_locale not null default 'el',
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.plants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  plant_type public.plant_type not null,
  capacity_mw numeric(10, 3) not null check (capacity_mw > 0 and capacity_mw <= 1000),
  support_scheme public.support_scheme not null default 'unknown',
  location_name text check (char_length(location_name) <= 120),
  latitude numeric(8, 5) check (latitude between 34 and 42.5),
  longitude numeric(8, 5) check (longitude between 19 and 30),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);
create index plants_org_id_idx on public.plants (org_id);

-- Biogas-specific operating constraints (one row per biogas plant).
create table public.biogas_params (
  plant_id uuid primary key references public.plants (id) on delete cascade,
  -- Average biogas production expressed as electrical output (MWe). Flat production = this value.
  avg_production_mw numeric(10, 3) not null check (avg_production_mw > 0),
  -- Gas storage expressed as hours of full-load production.
  gas_storage_hours numeric(6, 2) not null check (gas_storage_hours >= 0 and gas_storage_hours <= 72),
  min_load_pct numeric(5, 2) not null check (min_load_pct >= 0 and min_load_pct <= 100),
  max_load_mw numeric(10, 3) not null check (max_load_mw > 0),
  max_starts_per_day smallint not null check (max_starts_per_day between 1 and 24),
  -- Null means no ramp limit.
  ramp_mw_per_hour numeric(10, 3) check (ramp_mw_per_hour > 0),
  min_up_hours numeric(4, 2) not null default 1 check (min_up_hours >= 0 and min_up_hours <= 24),
  min_down_hours numeric(4, 2) not null default 1 check (min_down_hours >= 0 and min_down_hours <= 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (avg_production_mw <= max_load_mw)
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger plants_updated_at before update on public.plants
  for each row execute function public.set_updated_at();
create trigger biogas_params_updated_at before update on public.biogas_params
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership checks. SECURITY DEFINER so policies on memberships don't recurse.
-- ---------------------------------------------------------------------------
create function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target_org and m.user_id = (select auth.uid())
  );
$$;

create function public.is_org_owner(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target_org and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.is_org_owner(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile + personal organization + owner membership.
-- Signup metadata: { full_name, org_name, locale }.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  display_name text := nullif(left(trim(coalesce(meta ->> 'full_name', meta ->> 'name', '')), 120), '');
  org_name text := nullif(left(trim(coalesce(meta ->> 'org_name', '')), 120), '');
  user_locale public.app_locale := case when meta ->> 'locale' = 'en' then 'en'::public.app_locale else 'el'::public.app_locale end;
  new_org_id uuid;
begin
  insert into public.profiles (id, full_name, locale)
  values (new.id, display_name, user_locale);

  insert into public.organizations (name, created_by)
  values (coalesce(org_name, display_name, split_part(new.email, '@', 1), 'My organization'), new.id)
  returning id into new_org_id;

  insert into public.memberships (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Privileges. anon gets nothing; authenticated gets only what the policies allow.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.organizations, public.memberships, public.plants, public.biogas_params from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, locale) on public.profiles to authenticated;

grant select on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;

grant select on public.memberships to authenticated;

grant select, delete on public.plants to authenticated;
grant insert (org_id, name, plant_type, capacity_mw, support_scheme, location_name, latitude, longitude, notes)
  on public.plants to authenticated;
grant update (name, plant_type, capacity_mw, support_scheme, location_name, latitude, longitude, notes)
  on public.plants to authenticated;

grant select, delete on public.biogas_params to authenticated;
grant insert (plant_id, avg_production_mw, gas_storage_hours, min_load_pct, max_load_mw, max_starts_per_day,
              ramp_mw_per_hour, min_up_hours, min_down_hours)
  on public.biogas_params to authenticated;
grant update (avg_production_mw, gas_storage_hours, min_load_pct, max_load_mw, max_starts_per_day,
              ramp_mw_per_hour, min_up_hours, min_down_hours)
  on public.biogas_params to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.plants enable row level security;
alter table public.biogas_params enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "organizations: members read" on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy "organizations: owners update" on public.organizations
  for update to authenticated using (public.is_org_owner(id)) with check (public.is_org_owner(id));

create policy "memberships: members read org memberships" on public.memberships
  for select to authenticated using (public.is_org_member(org_id));

create policy "plants: members read" on public.plants
  for select to authenticated using (public.is_org_member(org_id));
create policy "plants: members insert" on public.plants
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "plants: members update" on public.plants
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "plants: members delete" on public.plants
  for delete to authenticated using (public.is_org_member(org_id));

create policy "biogas_params: members all" on public.biogas_params
  for all to authenticated
  using (exists (select 1 from public.plants p where p.id = plant_id and public.is_org_member(p.org_id)))
  with check (exists (select 1 from public.plants p where p.id = plant_id and public.is_org_member(p.org_id)));

-- ---------------------------------------------------------------------------
-- Atomic create/update of a plant and its biogas parameters.
-- SECURITY INVOKER: runs with the caller's privileges, so all RLS policies above apply.
-- p_biogas null => the plant has no biogas parameters (they're removed if present).
-- ---------------------------------------------------------------------------
create function public.save_plant(
  p_org_id uuid,
  p_plant jsonb,
  p_biogas jsonb default null,
  p_plant_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_plant_id is null then
    insert into public.plants (org_id, name, plant_type, capacity_mw, support_scheme, location_name, latitude, longitude, notes)
    values (
      p_org_id,
      p_plant ->> 'name',
      (p_plant ->> 'plant_type')::public.plant_type,
      (p_plant ->> 'capacity_mw')::numeric,
      coalesce((p_plant ->> 'support_scheme')::public.support_scheme, 'unknown'),
      p_plant ->> 'location_name',
      (p_plant ->> 'latitude')::numeric,
      (p_plant ->> 'longitude')::numeric,
      p_plant ->> 'notes'
    )
    returning id into v_id;
  else
    update public.plants set
      name = p_plant ->> 'name',
      plant_type = (p_plant ->> 'plant_type')::public.plant_type,
      capacity_mw = (p_plant ->> 'capacity_mw')::numeric,
      support_scheme = coalesce((p_plant ->> 'support_scheme')::public.support_scheme, 'unknown'),
      location_name = p_plant ->> 'location_name',
      latitude = (p_plant ->> 'latitude')::numeric,
      longitude = (p_plant ->> 'longitude')::numeric,
      notes = p_plant ->> 'notes'
    where id = p_plant_id
    returning id into v_id;

    if v_id is null then
      raise exception 'plant % not found', p_plant_id using errcode = 'P0002';
    end if;
  end if;

  if p_biogas is null then
    delete from public.biogas_params where plant_id = v_id;
  else
    insert into public.biogas_params (
      plant_id, avg_production_mw, gas_storage_hours, min_load_pct, max_load_mw, max_starts_per_day,
      ramp_mw_per_hour, min_up_hours, min_down_hours
    )
    values (
      v_id,
      (p_biogas ->> 'avg_production_mw')::numeric,
      (p_biogas ->> 'gas_storage_hours')::numeric,
      (p_biogas ->> 'min_load_pct')::numeric,
      (p_biogas ->> 'max_load_mw')::numeric,
      (p_biogas ->> 'max_starts_per_day')::smallint,
      (p_biogas ->> 'ramp_mw_per_hour')::numeric,
      coalesce((p_biogas ->> 'min_up_hours')::numeric, 1),
      coalesce((p_biogas ->> 'min_down_hours')::numeric, 1)
    )
    on conflict (plant_id) do update set
      avg_production_mw = excluded.avg_production_mw,
      gas_storage_hours = excluded.gas_storage_hours,
      min_load_pct = excluded.min_load_pct,
      max_load_mw = excluded.max_load_mw,
      max_starts_per_day = excluded.max_starts_per_day,
      ramp_mw_per_hour = excluded.ramp_mw_per_hour,
      min_up_hours = excluded.min_up_hours,
      min_down_hours = excluded.min_down_hours;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_plant(uuid, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_plant(uuid, jsonb, jsonb, uuid) to authenticated;
