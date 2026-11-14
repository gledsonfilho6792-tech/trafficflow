-- =========================================================
-- TRAFFIC FLOW
-- Migration 005
-- Meta Ads: campaigns, ad_sets e ads
-- =========================================================


-- =========================================================
-- CAMPAIGNS
-- =========================================================

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  ad_account_id uuid not null
    references public.ad_accounts(id)
    on delete cascade,

  external_id text not null,

  name text not null,

  status text,

  effective_status text,

  objective text,

  buying_type text,

  start_time timestamptz,
  stop_time timestamptz,

  created_time_meta timestamptz,
  updated_time_meta timestamptz,

  raw_data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint campaigns_account_external_unique
    unique (ad_account_id, external_id)
);


-- =========================================================
-- AD SETS
-- =========================================================

create table if not exists public.ad_sets (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  ad_account_id uuid not null
    references public.ad_accounts(id)
    on delete cascade,

  campaign_id uuid not null
    references public.campaigns(id)
    on delete cascade,

  external_id text not null,

  name text not null,

  status text,

  effective_status text,

  optimization_goal text,

  billing_event text,

  daily_budget numeric(18,2),
  lifetime_budget numeric(18,2),

  start_time timestamptz,
  end_time timestamptz,

  created_time_meta timestamptz,
  updated_time_meta timestamptz,

  raw_data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ad_sets_account_external_unique
    unique (ad_account_id, external_id)
);


-- =========================================================
-- ADS
-- =========================================================

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  ad_account_id uuid not null
    references public.ad_accounts(id)
    on delete cascade,

  campaign_id uuid not null
    references public.campaigns(id)
    on delete cascade,

  ad_set_id uuid not null
    references public.ad_sets(id)
    on delete cascade,

  external_id text not null,

  creative_external_id text,

  name text not null,

  status text,

  effective_status text,

  created_time_meta timestamptz,
  updated_time_meta timestamptz,

  raw_data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ads_account_external_unique
    unique (ad_account_id, external_id)
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists idx_campaigns_project_id
  on public.campaigns(project_id);

create index if not exists idx_campaigns_ad_account_id
  on public.campaigns(ad_account_id);

create index if not exists idx_ad_sets_project_id
  on public.ad_sets(project_id);

create index if not exists idx_ad_sets_campaign_id
  on public.ad_sets(campaign_id);

create index if not exists idx_ads_project_id
  on public.ads(project_id);

create index if not exists idx_ads_campaign_id
  on public.ads(campaign_id);

create index if not exists idx_ads_ad_set_id
  on public.ads(ad_set_id);


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists campaigns_set_updated_at
on public.campaigns;

create trigger campaigns_set_updated_at
before update on public.campaigns
for each row
execute function public.set_updated_at();


drop trigger if exists ad_sets_set_updated_at
on public.ad_sets;

create trigger ad_sets_set_updated_at
before update on public.ad_sets
for each row
execute function public.set_updated_at();


drop trigger if exists ads_set_updated_at
on public.ads;

create trigger ads_set_updated_at
before update on public.ads
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.campaigns
enable row level security;

alter table public.ad_sets
enable row level security;

alter table public.ads
enable row level security;


-- CAMPAIGNS

create policy "Users can view own campaigns"
on public.campaigns
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = campaigns.project_id
      and projects.owner_id = auth.uid()
  )
);


-- AD SETS

create policy "Users can view own ad sets"
on public.ad_sets
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = ad_sets.project_id
      and projects.owner_id = auth.uid()
  )
);


-- ADS

create policy "Users can view own ads"
on public.ads
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = ads.project_id
      and projects.owner_id = auth.uid()
  )
);