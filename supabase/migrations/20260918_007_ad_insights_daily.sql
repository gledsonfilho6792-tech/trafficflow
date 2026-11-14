-- =========================================================
-- TRAFFIC FLOW
-- Migration 007
-- Métricas diárias Meta Ads
-- =========================================================

create table if not exists public.ad_insights_daily (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  ad_account_id uuid not null
    references public.ad_accounts(id)
    on delete cascade,

  campaign_id uuid
    references public.campaigns(id)
    on delete cascade,

  ad_set_id uuid
    references public.ad_sets(id)
    on delete cascade,

  ad_id uuid
    references public.ads(id)
    on delete cascade,

  -- campaign | adset | ad
  level text not null
    check (
      level in ('campaign', 'adset', 'ad')
    ),

  -- ID original da entidade na Meta
  external_id text not null,

  metric_date date not null,

  currency char(3),

  -- Valor original da conta Meta.
  -- Ex.: USD 50.25
  spend_native numeric(18,6) not null default 0,

  -- Deixamos preparado para conversão histórica USD -> BRL.
  fx_rate_to_brl numeric(18,8),

  spend_brl numeric(18,6),

  impressions bigint not null default 0,

  reach bigint not null default 0,

  clicks bigint not null default 0,

  cpm numeric(18,6),

  cpc numeric(18,6),

  ctr numeric(18,6),

  frequency numeric(18,6),

  -- A Meta retorna várias ações/conversões em arrays.
  -- Guardaremos o conteúdo completo para normalizar depois.
  actions jsonb not null default '[]'::jsonb,

  action_values jsonb not null default '[]'::jsonb,

  raw_data jsonb not null default '{}'::jsonb,

  synced_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ad_insights_daily_entity_unique
    unique (
      ad_account_id,
      level,
      external_id,
      metric_date
    )
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_ad_insights_daily_project_date
on public.ad_insights_daily (
  project_id,
  metric_date
);


create index if not exists
  idx_ad_insights_daily_account_date
on public.ad_insights_daily (
  ad_account_id,
  metric_date
);


create index if not exists
  idx_ad_insights_daily_campaign_date
on public.ad_insights_daily (
  campaign_id,
  metric_date
);


create index if not exists
  idx_ad_insights_daily_adset_date
on public.ad_insights_daily (
  ad_set_id,
  metric_date
);


create index if not exists
  idx_ad_insights_daily_ad_date
on public.ad_insights_daily (
  ad_id,
  metric_date
);


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
  ad_insights_daily_set_updated_at
on public.ad_insights_daily;

create trigger
  ad_insights_daily_set_updated_at
before update
on public.ad_insights_daily
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.ad_insights_daily
enable row level security;


drop policy if exists
  "Users can view own ad insights"
on public.ad_insights_daily;

create policy
  "Users can view own ad insights"
on public.ad_insights_daily
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id =
      ad_insights_daily.project_id
      and projects.owner_id = auth.uid()
  )
);