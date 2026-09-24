-- Marketplace milestone 2: seller listings and buyer search.
--
-- Sellers manage their listings directly (RLS). Status changes go through set_listing_status(),
-- which enforces the rules (only verified sellers publish; closed is final).
-- Buyers never read the listings table: they use search_listings() (also for a single listing),
-- which return only active listings, an approximate location (a ~5 km grid cell) and a distance
-- rounded to 5 km, so sellers' exact sites stay private.

create type public.listing_status as enum ('draft', 'active', 'paused', 'closed');
create type public.quantity_period as enum ('week', 'month', 'year');
create type public.transport_terms as enum ('seller_delivers', 'buyer_collects', 'negotiable');

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so they work inside RLS policies without recursion)
-- ---------------------------------------------------------------------------
create function public.org_has_role(target_org uuid, wanted public.market_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.organizations o where o.id = target_org and o.market_role = wanted);
$$;

create function public.site_belongs_to(target_site uuid, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.sites s where s.id = target_site and s.org_id = target_org);
$$;

revoke execute on function public.org_has_role(uuid, public.market_role) from public, anon;
revoke execute on function public.site_belongs_to(uuid, uuid) from public, anon;
grant execute on function public.org_has_role(uuid, public.market_role) to authenticated;
grant execute on function public.site_belongs_to(uuid, uuid) to authenticated;

-- Great-circle distance in km.
create function public.haversine_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete restrict,
  feedstock_code text not null references public.feedstock_types (code),
  title text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 4000),
  unit public.quantity_unit not null,
  quantity numeric(12, 2) not null check (quantity > 0 and quantity <= 1000000),
  quantity_period public.quantity_period not null,
  available_from date not null,
  available_until date,
  dm_pct numeric(5, 2) check (dm_pct > 0 and dm_pct <= 100),          -- measured dry matter, if known
  transport public.transport_terms not null default 'negotiable',
  -- EUR per unit. Positive: the buyer pays. Zero: free. Negative: gate fee, the seller pays the buyer.
  price_per_unit numeric(10, 2) not null check (price_per_unit between -10000 and 10000),
  status public.listing_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_until is null or available_until >= available_from)
);
create index listings_org_id_idx on public.listings (org_id);
create index listings_active_idx on public.listings (feedstock_code) where status = 'active';
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

revoke all on public.listings from anon, authenticated;
grant select, delete on public.listings to authenticated;
grant insert (org_id, site_id, feedstock_code, title, description, unit, quantity, quantity_period,
              available_from, available_until, dm_pct, transport, price_per_unit)
  on public.listings to authenticated;
grant update (site_id, feedstock_code, title, description, unit, quantity, quantity_period,
              available_from, available_until, dm_pct, transport, price_per_unit)
  on public.listings to authenticated;

alter table public.listings enable row level security;

create policy "listings: own organization reads" on public.listings
  for select to authenticated using (public.is_org_member(org_id) or public.is_platform_admin());
create policy "listings: sellers create on their own sites" on public.listings
  for insert to authenticated with check (
    public.is_org_member(org_id) and public.org_has_role(org_id, 'seller') and public.site_belongs_to(site_id, org_id)
  );
create policy "listings: sellers edit open listings" on public.listings
  for update to authenticated
  using (public.is_org_member(org_id) and status <> 'closed')
  with check (public.is_org_member(org_id) and public.site_belongs_to(site_id, org_id));
create policy "listings: sellers delete drafts" on public.listings
  for delete to authenticated using (public.is_org_member(org_id) and status = 'draft');

-- ---------------------------------------------------------------------------
-- Status changes
-- ---------------------------------------------------------------------------
create function public.set_listing_status(p_listing_id uuid, p_status public.listing_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
  v_verified boolean;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  if v_listing.id is null or not public.is_org_member(v_listing.org_id) then
    raise exception 'listing % not found', p_listing_id using errcode = 'P0002';
  end if;

  if v_listing.status = 'closed' then
    raise exception 'a closed listing cannot be changed' using errcode = '22023';
  end if;
  if p_status = 'draft' then
    raise exception 'a listing cannot go back to draft' using errcode = '22023';
  end if;

  if p_status = 'active' then
    select o.verification_status = 'verified' and o.market_role = 'seller' into v_verified
    from public.organizations o where o.id = v_listing.org_id;
    if not coalesce(v_verified, false) then
      raise exception 'only verified sellers can publish listings' using errcode = '42501';
    end if;
    if v_listing.available_until is not null and v_listing.available_until < current_date then
      raise exception 'the availability period has ended' using errcode = '22023';
    end if;
  end if;

  update public.listings
  set status = p_status,
      published_at = case when p_status = 'active' then coalesce(published_at, now()) else published_at end
  where id = p_listing_id;
end;
$$;
revoke execute on function public.set_listing_status(uuid, public.listing_status) from public, anon;
grant execute on function public.set_listing_status(uuid, public.listing_status) to authenticated;

-- ---------------------------------------------------------------------------
-- Buyer search: active listings with approximate location and rounded distance.
-- ---------------------------------------------------------------------------
create function public.search_listings(
  p_site_id uuid,
  p_feedstock_codes text[] default null,
  p_max_km integer default null,
  p_price text default null,           -- 'paid' (> 0), 'free' (= 0), 'gate_fee' (< 0)
  p_listing_id uuid default null,       -- a single listing (detail page)
  p_limit integer default 200
)
returns table (
  listing_id uuid,
  title text,
  description text,
  feedstock_code text,
  unit public.quantity_unit,
  quantity numeric,
  quantity_period public.quantity_period,
  available_from date,
  available_until date,
  dm_pct numeric,
  transport public.transport_terms,
  price_per_unit numeric,
  published_at timestamptz,
  municipality text,
  approx_lat numeric,
  approx_lon numeric,
  distance_km integer,
  seller_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_origin public.sites;
begin
  select s.* into v_origin from public.sites s where s.id = p_site_id;
  if v_origin.id is null
     or not public.is_org_member(v_origin.org_id)
     or not (public.org_has_role(v_origin.org_id, 'buyer') or public.is_platform_admin()) then
    raise exception 'search is available to buyers from one of their own sites' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.title,
    l.description,
    l.feedstock_code,
    l.unit,
    l.quantity,
    l.quantity_period,
    l.available_from,
    l.available_until,
    l.dm_pct,
    l.transport,
    l.price_per_unit,
    l.published_at,
    s.municipality,
    -- ~5 km grid cell centre: enough to judge distance, not enough to find the farm.
    (round(s.latitude * 20) / 20)::numeric(8, 3),
    (round(s.longitude * 20) / 20)::numeric(8, 3),
    greatest(5, (round(public.haversine_km(v_origin.latitude, v_origin.longitude, s.latitude, s.longitude) / 5) * 5))::integer,
    o.name
  from public.listings l
  join public.sites s on s.id = l.site_id
  join public.organizations o on o.id = l.org_id
  where l.status = 'active'
    and o.verification_status = 'verified'
    and (l.available_until is null or l.available_until >= current_date)
    and (p_listing_id is null or l.id = p_listing_id)
    and (p_feedstock_codes is null or cardinality(p_feedstock_codes) = 0 or l.feedstock_code = any (p_feedstock_codes))
    and (p_max_km is null or public.haversine_km(v_origin.latitude, v_origin.longitude, s.latitude, s.longitude) <= p_max_km)
    and (
      p_price is null
      or (p_price = 'paid' and l.price_per_unit > 0)
      or (p_price = 'free' and l.price_per_unit = 0)
      or (p_price = 'gate_fee' and l.price_per_unit < 0)
    )
  order by public.haversine_km(v_origin.latitude, v_origin.longitude, s.latitude, s.longitude), l.published_at desc
  limit least(greatest(p_limit, 1), 500);
end;
$$;
revoke execute on function public.search_listings(uuid, text[], integer, text, uuid, integer) from public, anon;
grant execute on function public.search_listings(uuid, text[], integer, text, uuid, integer) to authenticated;
