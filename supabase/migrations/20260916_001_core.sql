-- =========================================================
-- TRAFFIC FLOW
-- Migration 001 - Core
-- Projects + Integrations + RLS
-- =========================================================


-- =========================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =========================================================
-- TABELA: projects
-- Cada operação/produto/oferta será um projeto separado.
-- =========================================================

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  slug text not null,

  timezone text not null default 'America/Fortaleza',
  base_currency char(3) not null default 'BRL',

  status text not null default 'active'
    check (status in ('active', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint projects_owner_slug_unique
    unique (owner_id, slug)
);


-- =========================================================
-- TABELA: integrations
-- Meta, Kiwify, PerfectPay, Telegram etc.
-- =========================================================

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  provider text not null,

  integration_type text not null,

  name text,

  status text not null default 'disconnected'
    check (
      status in (
        'disconnected',
        'connected',
        'error',
        'disabled'
      )
    ),

  external_account_id text,

  config jsonb not null default '{}'::jsonb,

  credentials_secret_id uuid,
  webhook_secret_id uuid,

  last_synced_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists idx_projects_owner_id
  on public.projects(owner_id);


create index if not exists idx_integrations_project_id
  on public.integrations(project_id);


create index if not exists idx_integrations_provider
  on public.integrations(provider);


create unique index if not exists idx_integrations_external_account
  on public.integrations(
    project_id,
    provider,
    integration_type,
    external_account_id
  )
  where external_account_id is not null;


-- =========================================================
-- TRIGGERS DE updated_at
-- =========================================================

drop trigger if exists projects_set_updated_at
on public.projects;

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();


drop trigger if exists integrations_set_updated_at
on public.integrations;

create trigger integrations_set_updated_at
before update on public.integrations
for each row
execute function public.set_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.projects enable row level security;
alter table public.integrations enable row level security;


-- =========================================================
-- POLICIES: projects
-- Usuário só acessa os próprios projetos.
-- =========================================================

drop policy if exists "Users can view own projects"
on public.projects;

create policy "Users can view own projects"
on public.projects
for select
to authenticated
using (
  auth.uid() = owner_id
);


drop policy if exists "Users can create own projects"
on public.projects;

create policy "Users can create own projects"
on public.projects
for insert
to authenticated
with check (
  auth.uid() = owner_id
);


drop policy if exists "Users can update own projects"
on public.projects;

create policy "Users can update own projects"
on public.projects
for update
to authenticated
using (
  auth.uid() = owner_id
)
with check (
  auth.uid() = owner_id
);


drop policy if exists "Users can delete own projects"
on public.projects;

create policy "Users can delete own projects"
on public.projects
for delete
to authenticated
using (
  auth.uid() = owner_id
);


-- =========================================================
-- POLICIES: integrations
-- Só acessa integrações pertencentes aos próprios projetos.
-- =========================================================

drop policy if exists "Users can view project integrations"
on public.integrations;

create policy "Users can view project integrations"
on public.integrations
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = integrations.project_id
      and projects.owner_id = auth.uid()
  )
);


drop policy if exists "Users can create project integrations"
on public.integrations;

create policy "Users can create project integrations"
on public.integrations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = integrations.project_id
      and projects.owner_id = auth.uid()
  )
);


drop policy if exists "Users can update project integrations"
on public.integrations;

create policy "Users can update project integrations"
on public.integrations
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = integrations.project_id
      and projects.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = integrations.project_id
      and projects.owner_id = auth.uid()
  )
);


drop policy if exists "Users can delete project integrations"
on public.integrations;

create policy "Users can delete project integrations"
on public.integrations
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = integrations.project_id
      and projects.owner_id = auth.uid()
  )
);