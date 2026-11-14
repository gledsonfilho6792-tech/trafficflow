create table if not exists public.attribution_tokens (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  tracking_source_id uuid not null
    references public.tracking_sources(id)
    on delete cascade,

  session_id uuid not null,
  visitor_id uuid not null,

  token text not null,

  created_at timestamptz not null
    default now(),

  last_used_at timestamptz,

  expires_at timestamptz not null
    default (
      now() + interval '30 days'
    ),

  constraint attribution_tokens_token_format
    check (
      token ~ '^tf_[A-Za-z0-9_-]{8,64}$'
    )
);


create unique index if not exists
  attribution_tokens_token_unique
on public.attribution_tokens(token);


create unique index if not exists
  attribution_tokens_source_session_unique
on public.attribution_tokens(
  tracking_source_id,
  session_id
);


create index if not exists
  attribution_tokens_project_idx
on public.attribution_tokens(
  project_id
);


create index if not exists
  attribution_tokens_session_idx
on public.attribution_tokens(
  session_id
);


create index if not exists
  attribution_tokens_visitor_idx
on public.attribution_tokens(
  visitor_id
);


alter table
  public.attribution_tokens
enable row level security;


drop policy if exists
  "attribution_tokens_owner_select"
on public.attribution_tokens;


create policy
  "attribution_tokens_owner_select"
on public.attribution_tokens
for select
using (
  exists (
    select 1
    from public.projects
    where
      projects.id =
        attribution_tokens.project_id
      and projects.owner_id =
        auth.uid()
  )
);