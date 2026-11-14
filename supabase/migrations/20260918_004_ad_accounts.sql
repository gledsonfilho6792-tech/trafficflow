-- =========================================================
-- TRAFFIC FLOW
-- Migration 004
-- Contas de anúncios
-- =========================================================

create table if not exists public.ad_accounts (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  integration_id uuid not null
    references public.integrations(id)
    on delete cascade,

  provider text not null,

  external_id text not null,
  account_id text,

  name text,

  account_status integer,

  currency char(3),

  timezone_name text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ad_accounts_integration_external_unique
    unique (integration_id, external_id)
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists idx_ad_accounts_project_id
  on public.ad_accounts(project_id);

create index if not exists idx_ad_accounts_integration_id
  on public.ad_accounts(integration_id);

create index if not exists idx_ad_accounts_external_id
  on public.ad_accounts(external_id);


-- =========================================================
-- UPDATED_AT
-- Reutiliza a função criada na Migration 001
-- =========================================================

drop trigger if exists ad_accounts_set_updated_at
on public.ad_accounts;

create trigger ad_accounts_set_updated_at
before update on public.ad_accounts
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.ad_accounts
enable row level security;


drop policy if exists "Users can view own ad accounts"
on public.ad_accounts;

create policy "Users can view own ad accounts"
on public.ad_accounts
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = ad_accounts.project_id
      and projects.owner_id = auth.uid()
  )
);


drop policy if exists "Users can create own ad accounts"
on public.ad_accounts;

create policy "Users can create own ad accounts"
on public.ad_accounts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = ad_accounts.project_id
      and projects.owner_id = auth.uid()
  )
);


drop policy if exists "Users can update own ad accounts"
on public.ad_accounts;

create policy "Users can update own ad accounts"
on public.ad_accounts
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = ad_accounts.project_id
      and projects.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = ad_accounts.project_id
      and projects.owner_id = auth.uid()
  )
);


drop policy if exists "Users can delete own ad accounts"
on public.ad_accounts;

create policy "Users can delete own ad accounts"
on public.ad_accounts
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = ad_accounts.project_id
      and projects.owner_id = auth.uid()
  )
);