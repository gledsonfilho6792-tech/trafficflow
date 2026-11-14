-- =========================================================
-- TRAFFIC FLOW
-- Migration 021
-- Sales Summary
-- =========================================================

create or replace function public.get_sales_summary(
  p_project_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  total_orders bigint,
  approved bigint,
  pending bigint,
  refunded bigint,
  chargebacks bigint,
  canceled bigint,
  disputed bigint,
  attributed bigint,
  approved_revenue numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint
      as total_orders,

    count(*) filter (
      where o.status = 'paid'
    )::bigint
      as approved,

    count(*) filter (
      where o.status = 'pending'
    )::bigint
      as pending,

    count(*) filter (
      where o.status = 'refunded'
    )::bigint
      as refunded,

    count(*) filter (
      where o.status = 'chargeback'
    )::bigint
      as chargebacks,

    count(*) filter (
      where o.status = 'canceled'
    )::bigint
      as canceled,

    count(*) filter (
      where o.status = 'disputed'
    )::bigint
      as disputed,

    count(*) filter (
      where o.tracking_session_id is not null
    )::bigint
      as attributed,

    coalesce(
      sum(o.gross_amount) filter (
        where o.status = 'paid'
      ),
      0
    )::numeric
      as approved_revenue

  from public.orders o

  where
    o.project_id = p_project_id

    and o.created_at >= p_start

    and o.created_at < p_end;
$$;


revoke all
on function public.get_sales_summary(
  uuid,
  timestamptz,
  timestamptz
)
from public;


revoke all
on function public.get_sales_summary(
  uuid,
  timestamptz,
  timestamptz
)
from anon;


revoke all
on function public.get_sales_summary(
  uuid,
  timestamptz,
  timestamptz
)
from authenticated;


grant execute
on function public.get_sales_summary(
  uuid,
  timestamptz,
  timestamptz
)
to service_role;