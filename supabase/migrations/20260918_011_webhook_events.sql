-- =========================================================
-- TRAFFIC FLOW
-- Migration 011
-- Caixa de entrada de Webhooks
-- =========================================================

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  integration_id uuid not null
    references public.integrations(id)
    on delete cascade,

  provider text not null,

  -- Será preenchido quando identificarmos
  -- o tipo exato enviado pelo provedor.
  event_type text,

  -- ID original do evento, se o provedor fornecer.
  external_event_id text,

  -- Hash usado para impedir que o mesmo
  -- webhook seja processado duas vezes.
  dedupe_key text not null,

  -- JSON original recebido.
  payload jsonb not null,

  status text not null default 'received'
    check (
      status in (
        'received',
        'processed',
        'ignored',
        'error'
      )
    ),

  received_at timestamptz not null default now(),

  processed_at timestamptz,

  error_message text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint webhook_events_integration_dedupe_unique
    unique (
      integration_id,
      dedupe_key
    )
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_webhook_events_project_received
on public.webhook_events (
  project_id,
  received_at desc
);


create index if not exists
  idx_webhook_events_integration_received
on public.webhook_events (
  integration_id,
  received_at desc
);


create index if not exists
  idx_webhook_events_status
on public.webhook_events (
  status
);


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
  webhook_events_set_updated_at
on public.webhook_events;

create trigger
  webhook_events_set_updated_at
before update
on public.webhook_events
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.webhook_events
enable row level security;


drop policy if exists
  "Users can view own webhook events"
on public.webhook_events;


create policy
  "Users can view own webhook events"
on public.webhook_events
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id =
      webhook_events.project_id
      and projects.owner_id =
        auth.uid()
  )
);