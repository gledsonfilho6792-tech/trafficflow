-- =========================================================
-- TRAFFIC FLOW
-- Migration 010
-- Histórico de sincronizações
-- =========================================================

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  integration_id uuid
    references public.integrations(id)
    on delete set null,

  provider text not null,

  sync_type text not null,

  -- queued | running | success | error
  status text not null default 'queued'
    check (
      status in (
        'queued',
        'running',
        'success',
        'error'
      )
    ),

  triggered_by text not null default 'manual'
    check (
      triggered_by in (
        'manual',
        'cron',
        'system'
      )
    ),

  period_start date,
  period_end date,

  started_at timestamptz,
  finished_at timestamptz,

  records_received integer not null default 0,
  records_saved integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_sync_runs_project_created
on public.sync_runs (
  project_id,
  created_at desc
);


create index if not exists
  idx_sync_runs_status
on public.sync_runs (
  status
);


create index if not exists
  idx_sync_runs_provider
on public.sync_runs (
  provider,
  sync_type
);


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
  sync_runs_set_updated_at
on public.sync_runs;

create trigger
  sync_runs_set_updated_at
before update
on public.sync_runs
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.sync_runs
enable row level security;


drop policy if exists
  "Users can view own sync runs"
on public.sync_runs;

create policy
  "Users can view own sync runs"
on public.sync_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id =
      sync_runs.project_id
      and projects.owner_id =
        auth.uid()
  )
);