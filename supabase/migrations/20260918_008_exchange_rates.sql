-- =========================================================
-- TRAFFIC FLOW
-- Migration 008
-- Cotações históricas de moedas
-- =========================================================

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),

  base_currency char(3) not null,
  quote_currency char(3) not null,

  rate_date date not null,

  -- Exemplo:
  -- USD -> BRL = 5.32
  -- significa 1 USD = R$ 5,32
  rate numeric(18,8) not null,

  source text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint exchange_rates_pair_date_unique
    unique (
      base_currency,
      quote_currency,
      rate_date
    ),

  constraint exchange_rates_positive
    check (rate > 0),

  constraint exchange_rates_different_currency
    check (
      base_currency <> quote_currency
    )
);


-- =========================================================
-- ÍNDICES
-- =========================================================

create index if not exists
  idx_exchange_rates_date
on public.exchange_rates (
  rate_date
);

create index if not exists
  idx_exchange_rates_pair_date
on public.exchange_rates (
  base_currency,
  quote_currency,
  rate_date
);


-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
  exchange_rates_set_updated_at
on public.exchange_rates;

create trigger
  exchange_rates_set_updated_at
before update
on public.exchange_rates
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.exchange_rates
enable row level security;


drop policy if exists
  "Authenticated users can view exchange rates"
on public.exchange_rates;

create policy
  "Authenticated users can view exchange rates"
on public.exchange_rates
for select
to authenticated
using (true);