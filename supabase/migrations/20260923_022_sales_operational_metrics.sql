-- =========================================================
-- TRAFFIC FLOW
-- Migration 022
-- Sales Operational Metrics
-- =========================================================


-- =========================================================
-- REMOVER VERSÃO ANTERIOR
-- =========================================================
--
-- A Migration 021 já criou get_sales_summary.
--
-- Como agora estamos alterando o formato do RETURNS TABLE,
-- PostgreSQL exige DROP + CREATE.
-- =========================================================

drop function if exists public.get_sales_summary(
  uuid,
  timestamptz,
  timestamptz
);


-- =========================================================
-- NOVA VERSÃO
-- =========================================================

create function public.get_sales_summary(
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
  approved_attributed bigint,

  approved_revenue numeric,
  attributed_revenue numeric,

  approval_rate numeric,
  attribution_rate numeric,
  average_ticket numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with metrics as (
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

      count(*) filter (
        where
          o.status = 'paid'
          and o.tracking_session_id is not null
      )::bigint
        as approved_attributed,

      coalesce(
        sum(o.gross_amount) filter (
          where o.status = 'paid'
        ),
        0
      )::numeric
        as approved_revenue,

      coalesce(
        sum(o.gross_amount) filter (
          where
            o.status = 'paid'
            and o.tracking_session_id is not null
        ),
        0
      )::numeric
        as attributed_revenue

    from public.orders o

    where
      o.project_id = p_project_id

      and o.created_at >= p_start

      and o.created_at < p_end
  )

  select
    m.total_orders,

    m.approved,

    m.pending,

    m.refunded,

    m.chargebacks,

    m.canceled,

    m.disputed,

    m.attributed,

    m.approved_attributed,

    m.approved_revenue,

    m.attributed_revenue,

    case
      when m.total_orders > 0
      then (
        m.approved::numeric /
        m.total_orders::numeric
      ) * 100

      else 0
    end
      as approval_rate,

    case
      when m.total_orders > 0
      then (
        m.attributed::numeric /
        m.total_orders::numeric
      ) * 100

      else 0
    end
      as attribution_rate,

    case
      when m.approved > 0
      then (
        m.approved_revenue /
        m.approved::numeric
      )

      else 0
    end
      as average_ticket

  from metrics m;
$$;


-- =========================================================
-- PERMISSÕES
-- =========================================================

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