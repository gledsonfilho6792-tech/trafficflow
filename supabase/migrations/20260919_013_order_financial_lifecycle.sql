-- =========================================================
-- TRAFFIC FLOW
-- Migration 013
-- Ciclo financeiro completo dos pedidos
-- =========================================================

alter table public.orders
  add column if not exists transaction_identifier text,

  add column if not exists charge_amount numeric(14, 2),

  add column if not exists commission_amount numeric(14, 2),

  add column if not exists original_amount numeric(14, 2),

  add column if not exists original_currency text,

  add column if not exists exchange_rate numeric(18, 8),

  add column if not exists customer_country text,

  add column if not exists customer_state text,

  add column if not exists customer_city text,

  add column if not exists dispute_id text,

  add column if not exists dispute_type text,

  add column if not exists dispute_status text,

  add column if not exists dispute_amount numeric(14, 2),

  add column if not exists dispute_fine_amount numeric(14, 2),

  add column if not exists dispute_origin text,

  add column if not exists dispute_details text,

  add column if not exists dispute_updated_at timestamptz;


create index if not exists
  idx_orders_transaction_identifier
on public.orders (
  integration_id,
  transaction_identifier
);


create index if not exists
  idx_orders_dispute_status
on public.orders (
  project_id,
  dispute_status
);