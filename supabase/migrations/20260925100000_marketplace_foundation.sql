-- Marketplace pivot, milestone 1: organization roles and profile, sites (facilities with a location),
-- the feedstock catalog, and admin verification. Replaces the forecasting-era plants/biogas_params.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.market_role as enum ('buyer', 'seller');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.site_type as enum ('biogas_plant', 'livestock_farm', 'agriculture', 'food_industry', 'other');
create type public.feedstock_category as enum (
  'animal_manure', 'energy_crop', 'agricultural_residue', 'food_industry', 'food_waste', 'other'
);
create type public.quantity_unit as enum ('t', 'm3');

-- ---------------------------------------------------------------------------
-- Greek VAT number (ΑΦΜ) check digit: 9 digits, sum(d_i * 2^(8-i)) for i=0..7, mod 11, mod 10 = d_8.
-- ---------------------------------------------------------------------------
create function public.is_valid_afm(afm text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  total integer := 0;
begin
  if afm is null or afm !~ '^[0-9]{9}$' or afm = '000000000' then
    return false;
  end if;
  for i in 1..8 loop
    total := total + substr(afm, i, 1)::integer * (2 ^ (9 - i))::integer;
  end loop;
  return (total % 11) % 10 = substr(afm, 9, 1)::integer;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizations: marketplace role and company profile
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column market_role public.market_role,               -- chosen at signup/onboarding, then fixed
  add column legal_name text check (char_length(legal_name) between 1 and 200),
  add column vat_number text check (vat_number is null or public.is_valid_afm(vat_number)),
  add column phone text check (phone ~ '^\+?[0-9 ]{10,20}$'),
  add column verification_status public.verification_status not null default 'pending',
  add column verified_at timestamptz,
  add column verification_note text check (char_length(verification_note) <= 1000),
  -- Payments (milestone 4); only the server writes these.
  add column stripe_customer_id text,
  add column stripe_account_id text,
  add column payouts_enabled boolean not null default false;

create unique index organizations_vat_role_idx on public.organizations (vat_number, market_role)
  where vat_number is not null;

-- Changing the legal identity of a verified organization sends it back for verification.
create function public.reset_verification_on_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.verification_status = 'verified'
     and (new.legal_name is distinct from old.legal_name or new.vat_number is distinct from old.vat_number)
     and new.verification_status = old.verification_status then
    new.verification_status := 'pending';
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger organizations_reset_verification before update on public.organizations
  for each row execute function public.reset_verification_on_identity_change();

grant update (legal_name, vat_number, phone) on public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- Platform admins
-- ---------------------------------------------------------------------------
create function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_platform_admin from public.profiles p where p.id = (select auth.uid())), false);
$$;
revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create policy "organizations: admins read all" on public.organizations
  for select to authenticated using (public.is_platform_admin());

create function public.admin_set_verification(
  p_org_id uuid,
  p_status public.verification_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.organizations
  set verification_status = p_status,
      verified_at = case when p_status = 'verified' then now() else null end,
      verification_note = p_note
  where id = p_org_id;
  if not found then
    raise exception 'organization % not found', p_org_id using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.admin_set_verification(uuid, public.verification_status, text) from public, anon;
grant execute on function public.admin_set_verification(uuid, public.verification_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Onboarding: set role (once) and company details for the caller's organization.
-- Used after Google sign-in (no signup form) and for accounts created before the pivot.
-- ---------------------------------------------------------------------------
create function public.complete_onboarding(
  p_role public.market_role,
  p_legal_name text,
  p_vat_number text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations;
begin
  select o.* into v_org
  from public.organizations o
  join public.memberships m on m.org_id = o.id
  where m.user_id = (select auth.uid()) and m.role = 'owner'
  order by m.created_at
  limit 1;

  if v_org.id is null then
    raise exception 'no organization owned by the current user' using errcode = '42501';
  end if;
  if v_org.market_role is not null and v_org.market_role <> p_role then
    raise exception 'the organization role cannot be changed' using errcode = '22023';
  end if;

  update public.organizations
  set market_role = p_role, legal_name = p_legal_name, vat_number = p_vat_number, phone = p_phone
  where id = v_org.id;
  return v_org.id;
end;
$$;
revoke execute on function public.complete_onboarding(public.market_role, text, text, text) from public, anon;
grant execute on function public.complete_onboarding(public.market_role, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- New users: the organization also gets the marketplace role chosen on the signup form.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
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
  chosen_role public.market_role := case meta ->> 'market_role'
    when 'buyer' then 'buyer'::public.market_role
    when 'seller' then 'seller'::public.market_role
    else null
  end;
  new_org_id uuid;
begin
  insert into public.profiles (id, full_name, locale)
  values (new.id, display_name, user_locale);

  insert into public.organizations (name, created_by, market_role)
  values (coalesce(org_name, display_name, split_part(new.email, '@', 1), 'My organization'), new.id, chosen_role)
  returning id into new_org_id;

  insert into public.memberships (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sites: facilities with a location (farms, food plants, biogas plants). Exact coordinates are
-- private to the organization; listings will expose an approximate location (milestone 2).
-- ---------------------------------------------------------------------------
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  site_type public.site_type not null,
  address text check (char_length(address) <= 200),
  municipality text check (char_length(municipality) <= 120),
  -- Bounding box of Greece (incl. islands).
  latitude numeric(8, 5) not null check (latitude between 34 and 42.5),
  longitude numeric(8, 5) not null check (longitude between 19 and 30),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sites_org_id_idx on public.sites (org_id);
create trigger sites_updated_at before update on public.sites
  for each row execute function public.set_updated_at();

-- Carry over pre-pivot plants that have coordinates (test data only at the time of the pivot).
insert into public.sites (id, org_id, name, site_type, municipality, latitude, longitude, notes, created_at)
select id, org_id, name,
       case when plant_type = 'biogas' then 'biogas_plant'::public.site_type else 'other'::public.site_type end,
       location_name, latitude, longitude, notes, created_at
from public.plants
where latitude is not null and longitude is not null;

drop function public.save_plant(uuid, jsonb, jsonb, uuid);
drop table public.biogas_params;
drop table public.plants;
drop type public.plant_type;
drop type public.support_scheme;

revoke all on public.sites from anon, authenticated;
grant select, delete on public.sites to authenticated;
grant insert (org_id, name, site_type, address, municipality, latitude, longitude, notes) on public.sites to authenticated;
grant update (name, site_type, address, municipality, latitude, longitude, notes) on public.sites to authenticated;

alter table public.sites enable row level security;
create policy "sites: members read" on public.sites
  for select to authenticated using (public.is_org_member(org_id));
create policy "sites: members insert" on public.sites
  for insert to authenticated with check (public.is_org_member(org_id));
create policy "sites: members update" on public.sites
  for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "sites: members delete" on public.sites
  for delete to authenticated using (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Feedstock catalog (public reference data). Typical values are indicative literature figures
-- (e.g. FNR "Leitfaden Biogas", KTBL); real material varies a lot, so listings can state measured values.
-- ---------------------------------------------------------------------------
create table public.feedstock_types (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  category public.feedstock_category not null,
  name_el text not null,
  name_en text not null,
  default_unit public.quantity_unit not null default 't',
  ewc_code text check (ewc_code ~ '^[0-9]{2} [0-9]{2} [0-9]{2}$'),  -- European Waste Catalogue (ΕΚΑ)
  is_animal_by_product boolean not null default false,
  abp_category smallint check (abp_category between 1 and 3),          -- Reg. (EC) 1069/2009
  typical_dm_pct numeric(5, 2) check (typical_dm_pct between 0 and 100),
  typical_biogas_m3_per_t numeric(6, 1) check (typical_biogas_m3_per_t >= 0),  -- per tonne fresh matter
  sort_order smallint not null default 100,
  active boolean not null default true,
  check (is_animal_by_product or abp_category is null)
);

insert into public.feedstock_types
  (code, category, name_el, name_en, default_unit, ewc_code, is_animal_by_product, abp_category, typical_dm_pct, typical_biogas_m3_per_t, sort_order)
values
  ('cattle_slurry', 'animal_manure', 'Υγρή κοπριά βοοειδών', 'Cattle slurry', 'm3', '02 01 06', true, 2, 8, 25, 10),
  ('cattle_manure', 'animal_manure', 'Στερεή κοπριά βοοειδών', 'Cattle solid manure', 't', '02 01 06', true, 2, 25, 80, 11),
  ('pig_slurry', 'animal_manure', 'Υγρά απόβλητα χοιροτροφείου', 'Pig slurry', 'm3', '02 01 06', true, 2, 6, 22, 12),
  ('poultry_manure', 'animal_manure', 'Κοπριά πουλερικών (όρνιθες)', 'Poultry manure', 't', '02 01 06', true, 2, 40, 140, 13),
  ('sheep_goat_manure', 'animal_manure', 'Κοπριά αιγοπροβάτων', 'Sheep and goat manure', 't', '02 01 06', true, 2, 30, 90, 14),
  ('maize_silage', 'energy_crop', 'Ενσίρωμα καλαμποκιού', 'Maize silage', 't', null, false, null, 33, 200, 20),
  ('grass_silage', 'energy_crop', 'Ενσίρωμα χόρτου', 'Grass silage', 't', null, false, null, 35, 180, 21),
  ('vegetable_residues', 'agricultural_residue', 'Υπολείμματα λαχανικών', 'Vegetable residues', 't', '02 01 03', false, null, 12, 60, 30),
  ('cheese_whey', 'food_industry', 'Τυρόγαλο', 'Cheese whey', 'm3', '02 05 01', true, 3, 6, 35, 40),
  ('olive_mill_wastewater', 'food_industry', 'Κατσίγαρος (απόνερα ελαιοτριβείου)', 'Olive mill wastewater', 'm3', null, false, null, 8, 35, 41),
  ('olive_pomace_wet', 'food_industry', 'Υγρή ελαιοπυρήνα (διφασικά)', 'Wet olive pomace (two-phase)', 't', '02 03 04', false, null, 30, 100, 42),
  ('fruit_veg_processing', 'food_industry', 'Απόβλητα επεξεργασίας φρούτων/λαχανικών', 'Fruit and vegetable processing waste', 't', '02 03 04', false, null, 15, 75, 43),
  ('brewery_spent_grain', 'food_industry', 'Βυνοπίτυρα ζυθοποιίας', 'Brewery spent grain', 't', '02 07 04', false, null, 22, 110, 44),
  ('grape_marc', 'food_industry', 'Στέμφυλα οινοποιίας', 'Grape marc', 't', '02 07 04', false, null, 40, 120, 45),
  ('slaughterhouse_rumen', 'food_industry', 'Περιεχόμενο στομάχων σφαγείου', 'Slaughterhouse rumen content', 't', '02 02 02', true, 2, 15, 60, 46),
  ('food_waste', 'food_waste', 'Απόβλητα τροφίμων / εστίασης', 'Food and catering waste', 't', '20 01 08', true, 3, 18, 110, 50),
  ('other', 'other', 'Άλλο', 'Other', 't', null, false, null, null, null, 99);

revoke all on public.feedstock_types from anon, authenticated;
grant select on public.feedstock_types to anon, authenticated;
alter table public.feedstock_types enable row level security;
create policy "feedstock_types: everyone reads" on public.feedstock_types for select to anon, authenticated using (true);
