-- =========================================================
-- TRAFFIC FLOW
-- Migration 014
-- Tracking Core
-- =========================================================


-- =========================================================
-- FONTES / SITES DE TRACKING
-- =========================================================

create table if not exists public.tracking_sources (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  name text not null,

  domain text,

  public_key uuid not null
    default gen_random_uuid()
    unique,

  is_active boolean
    not null
    default true,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


-- =========================================================
-- SESSÕES
-- =========================================================

create table if not exists public.tracking_sessions (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  tracking_source_id uuid not null
    references public.tracking_sources(id)
    on delete cascade,

  visitor_id uuid not null,

  session_id uuid not null,

  started_at timestamptz
    not null
    default now(),

  last_seen_at timestamptz
    not null
    default now(),

  landing_url text,

  referrer text,

  user_agent text,

  -- Não armazenaremos IP bruto.
  ip_hash text,

  country text,
  region text,
  city text,

  -- =======================================================
  -- ATRIBUIÇÃO
  -- =======================================================

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  fbclid text,

  -- Cookies Meta
  fbp text,
  fbc text,

  -- Preparado para outras fontes
  gclid text,
  ttclid text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint tracking_sessions_session_unique
    unique (
      tracking_source_id,
      session_id
    )
);


-- =========================================================
-- EVENTOS DE TRACKING
-- =========================================================

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  tracking_source_id uuid not null
    references public.tracking_sources(id)
    on delete cascade,

  tracking_session_id uuid not null
    references public.tracking_sessions(id)
    on delete cascade,

  visitor_id uuid not null,

  session_id uuid not null,

  event_name text not null,

  event_id uuid not null
    default gen_random_uuid()
    unique,

  page_url text,

  referrer text,

  metadata jsonb
    not null
    default '{}'::jsonb,

  occurred_at timestamptz
    not null
    default now(),

  created_at timestamptz
    not null
    default now()
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_tracking_sources_project
on public.tracking_sources (
  project_id
);


create index if not exists
  idx_tracking_sessions_project_started
on public.tracking_sessions (
  project_id,
  started_at desc
);


create index if not exists
  idx_tracking_sessions_visitor
on public.tracking_sessions (
  project_id,
  visitor_id,
  started_at desc
);


create index if not exists
  idx_tracking_sessions_fbclid
on public.tracking_sessions (
  project_id,
  fbclid
)
where fbclid is not null;


create index if not exists
  idx_tracking_events_project_occurred
on public.tracking_events (
  project_id,
  occurred_at desc
);


create index if not exists
  idx_tracking_events_session
on public.tracking_events (
  tracking_session_id,
  occurred_at
);


create index if not exists
  idx_tracking_events_name
on public.tracking_events (
  project_id,
  event_name,
  occurred_at desc
);


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
  tracking_sources_set_updated_at
on public.tracking_sources;

create trigger
  tracking_sources_set_updated_at
before update
on public.tracking_sources
for each row
execute function public.set_updated_at();


drop trigger if exists
  tracking_sessions_set_updated_at
on public.tracking_sessions;

create trigger
  tracking_sessions_set_updated_at
before update
on public.tracking_sessions
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.tracking_sources
enable row level security;

alter table public.tracking_sessions
enable row level security;

alter table public.tracking_events
enable row level security;


-- =========================================================
-- TRACKING SOURCES
-- =========================================================

drop policy if exists
  "Users can view own tracking sources"
on public.tracking_sources;

create policy
  "Users can view own tracking sources"
on public.tracking_sources
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id =
      tracking_sources.project_id
      and projects.owner_id =
        auth.uid()
  )
);


-- =========================================================
-- TRACKING SESSIONS
-- =========================================================

drop policy if exists
  "Users can view own tracking sessions"
on public.tracking_sessions;

create policy
  "Users can view own tracking sessions"
on public.tracking_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id =
      tracking_sessions.project_id
      and projects.owner_id =
        auth.uid()
  )
);


-- =========================================================
-- TRACKING EVENTS
-- =========================================================

drop policy if exists
  "Users can view own tracking events"
on public.tracking_events;

create policy
  "Users can view own tracking events"
on public.tracking_events
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id =
      tracking_events.project_id
      and projects.owner_id =
        auth.uid()
  )
);