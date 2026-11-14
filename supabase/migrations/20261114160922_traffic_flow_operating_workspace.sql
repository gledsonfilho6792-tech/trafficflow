-- Additive V6 workspace schema. Existing projects, orders and integrations are preserved.
begin;
create table if not exists public.project_settings (
 project_id uuid primary key references public.projects(id) on delete cascade,
 product_name text not null default '', sales_page_url text not null default '',
 checkout_url text not null default '', goal numeric(18,2) not null default 0 check(goal>=0),
 product_ids text[] not null default '{}', campaign_ids uuid[] not null default '{}',
 campaign_scope text not null default 'selected' check(campaign_scope in ('legacy','selected')),
 updated_at timestamptz not null default now()
);
create table if not exists public.user_project_preferences (
 project_id uuid references public.projects(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 preferences jsonb not null default '{}'::jsonb check(jsonb_typeof(preferences)='object'),
 updated_at timestamptz not null default now(), primary key(project_id,user_id)
);
create table if not exists public.finance_commitments (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160),
 direction text not null check(direction in ('income','expense')),
 amount numeric(18,2) not null check(amount>0), currency text not null default 'BRL' check(currency ~ '^[A-Z]{3}$'),
 category text not null default 'other', due_on date not null, paid_at timestamptz,
 created_at timestamptz not null default now(), unique(id,project_id)
);
create table if not exists public.cash_entries (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160),
 direction text not null check(direction in ('income','expense')),
 amount numeric(18,2) not null check(amount>0), currency text not null default 'BRL' check(currency ~ '^[A-Z]{3}$'),
 category text not null default 'other', occurred_on date not null,
 commitment_id uuid unique,
 foreign key(commitment_id,project_id) references public.finance_commitments(id,project_id) on delete restrict,
 created_at timestamptz not null default now()
);
create table if not exists public.automation_rules (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160),
 metric text not null check(metric in ('roi','revenue','profit','sales','untracked','integration_errors')),
 operator text not null check(operator in ('lt','gt','gte','lte')),
 threshold numeric not null, enabled boolean not null default true,
 window_days integer not null default 1 check(window_days between 1 and 30),
 last_evaluated_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.app_notifications (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('sale','rule','report','integration')),
 title text not null, body text not null, dedupe_key text not null,
 read_at timestamptz, created_at timestamptz not null default now(), unique(project_id,user_id,dedupe_key)
);
create table if not exists public.project_api_keys (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 name text not null, token_hash text not null unique,
 scopes text[] not null default '{reports:read}', revoked_at timestamptz,
 created_at timestamptz not null default now(), last_used_at timestamptz
);
create table if not exists public.conversion_deliveries (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 integration_id uuid not null references public.integrations(id) on delete cascade,
 order_id uuid references public.orders(id) on delete cascade,
 event_id text not null, provider text not null, status text not null default 'pending'
 check(status in ('pending','processing','sent','error','disabled')),
 attempts integer not null default 0, last_error text, next_attempt_at timestamptz not null default now(),
 sent_at timestamptz, created_at timestamptz not null default now(), unique(integration_id,event_id)
);
create table if not exists public.workspace_audit (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null, entity_id text, created_at timestamptz not null default now()
);
-- Preserve the existing per-project campaign attribution as an explicit initial selection.
insert into public.project_settings(project_id,product_name,campaign_scope,campaign_ids)
select p.id,p.name,'selected',coalesce(array_agg(c.id) filter(where c.id is not null),'{}'::uuid[])
from public.projects p left join public.campaigns c on c.project_id=p.id group by p.id,p.name
on conflict(project_id) do nothing;
-- Every new exposed table has explicit grants and ownership checks.
do $$ declare t text; begin
 foreach t in array array['project_settings','finance_commitments','cash_entries','automation_rules'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='project_owner') then
 execute format('create policy project_owner on public.%I for all to authenticated using (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())))',t);
 end if;
 end loop;
end $$;
alter table public.user_project_preferences enable row level security;
revoke all on public.user_project_preferences from anon, authenticated;
grant select,insert,update on public.user_project_preferences to authenticated;
grant all on public.user_project_preferences to service_role;
create policy preferences_owner on public.user_project_preferences for all to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
alter table public.app_notifications enable row level security;
revoke all on public.app_notifications from anon,authenticated;
grant select,update on public.app_notifications to authenticated;
grant all on public.app_notifications to service_role;
create policy notifications_owner on public.app_notifications for all to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
do $$ declare t text; begin
 foreach t in array array['project_api_keys','conversion_deliveries','workspace_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create index if not exists cash_project_date on public.cash_entries(project_id,occurred_on);
create index if not exists commitments_project_due on public.finance_commitments(project_id,due_on);
create index if not exists rules_project on public.automation_rules(project_id,enabled);
create index if not exists notifications_user_project on public.app_notifications(user_id,project_id,created_at desc);
create index if not exists deliveries_pending on public.conversion_deliveries(status,next_attempt_at);
-- Atomic settlement: lock commitment; at most one cash entry, in the same project.
create or replace function public.settle_finance_commitment(p_id uuid,p_paid boolean) returns uuid
language plpgsql security invoker set search_path='' as $$
declare c public.finance_commitments; v_id uuid;
begin
 select * into c from public.finance_commitments where id=p_id for update;
 if c.id is null then raise exception 'Compromisso não encontrado'; end if;
 if p_paid then
 insert into public.cash_entries(project_id,name,direction,amount,currency,category,occurred_on,commitment_id)
 values(c.project_id,c.name,c.direction,c.amount,c.currency,c.category,(now() at time zone (select timezone from public.projects where id=c.project_id))::date,c.id)
 on conflict(commitment_id) do update set name=excluded.name returning id into v_id;
 update public.finance_commitments set paid_at=coalesce(paid_at,now()) where id=c.id;
 else
 delete from public.cash_entries where commitment_id=c.id;
 update public.finance_commitments set paid_at=null where id=c.id;
 end if;
 return v_id;
end $$;
revoke all on function public.settle_finance_commitment(uuid,boolean) from public,anon;
grant execute on function public.settle_finance_commitment(uuid,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
