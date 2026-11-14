-- =========================================================
-- TRAFFIC FLOW
-- Migration 012
-- Orders / Order Items / Order Events
-- =========================================================


-- =========================================================
-- ORDERS
-- =========================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  integration_id uuid not null
    references public.integrations(id)
    on delete cascade,

  provider text not null,

  external_order_id text not null,

  external_transaction_id text,

  status text not null default 'pending',

  currency text not null default 'BRL',

  gross_amount numeric(14, 2) not null default 0,

  net_amount numeric(14, 2),

  payment_method text,

  installments integer,

  offer_code text,

  paid_at timestamptz,

  provider_created_at timestamptz,


  -- =======================================================
  -- CLIENTE
  -- Não armazenaremos CPF nem endereço completo.
  -- =======================================================

  customer_external_id text,

  customer_name text,

  customer_email text,

  customer_phone text,


  -- =======================================================
  -- TRACKING
  -- =======================================================

  utm_source text,

  utm_medium text,

  utm_campaign text,

  utm_content text,

  utm_term text,

  session_id text,

  visitor_id text,

  fbclid text,

  tracking_data jsonb
    not null
    default '{}'::jsonb,


  -- =======================================================
  -- ASSINATURA
  -- =======================================================

  subscription_external_id text,

  subscription_status text,


  -- Dados normalizados adicionais do provedor.
  raw_data jsonb
    not null
    default '{}'::jsonb,


  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),


  constraint orders_integration_external_order_unique
    unique (
      integration_id,
      external_order_id
    )
);


-- =========================================================
-- ORDER ITEMS
-- =========================================================

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders(id)
    on delete cascade,

  external_item_id text,

  external_product_id text,

  external_product_reference text,

  product_name text,

  quantity integer
    not null
    default 1,

  unit_price numeric(14, 2),

  total_amount numeric(14, 2),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


-- =========================================================
-- ORDER EVENTS
-- =========================================================

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders(id)
    on delete cascade,

  webhook_event_id uuid
    references public.webhook_events(id)
    on delete set null,

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  integration_id uuid not null
    references public.integrations(id)
    on delete cascade,

  provider text not null,

  event_type text not null,

  external_event_id text,

  normalized_status text,

  event_at timestamptz,

  data jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now(),

  constraint order_events_webhook_unique
    unique (
      webhook_event_id
    )
);


-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists
  idx_orders_project_created
on public.orders (
  project_id,
  created_at desc
);


create index if not exists
  idx_orders_project_status
on public.orders (
  project_id,
  status
);


create index if not exists
  idx_orders_project_paid
on public.orders (
  project_id,
  paid_at desc
);


create index if not exists
  idx_orders_transaction
on public.orders (
  integration_id,
  external_transaction_id
);


create index if not exists
  idx_order_items_order
on public.order_items (
  order_id
);


create index if not exists
  idx_order_events_order_created
on public.order_events (
  order_id,
  created_at desc
);


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
  orders_set_updated_at
on public.orders;

create trigger
  orders_set_updated_at
before update
on public.orders
for each row
execute function public.set_updated_at();


drop trigger if exists
  order_items_set_updated_at
on public.order_items;

create trigger
  order_items_set_updated_at
before update
on public.order_items
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.orders
enable row level security;

alter table public.order_items
enable row level security;

alter table public.order_events
enable row level security;


-- =========================================================
-- ORDERS POLICY
-- =========================================================

drop policy if exists
  "Users can view own orders"
on public.orders;

create policy
  "Users can view own orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = orders.project_id
      and projects.owner_id = auth.uid()
  )
);


-- =========================================================
-- ORDER ITEMS POLICY
-- =========================================================

drop policy if exists
  "Users can view own order items"
on public.order_items;

create policy
  "Users can view own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    join public.projects
      on projects.id = orders.project_id
    where orders.id = order_items.order_id
      and projects.owner_id = auth.uid()
  )
);


-- =========================================================
-- ORDER EVENTS POLICY
-- =========================================================

drop policy if exists
  "Users can view own order events"
on public.order_events;

create policy
  "Users can view own order events"
on public.order_events
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = order_events.project_id
      and projects.owner_id = auth.uid()
  )
);