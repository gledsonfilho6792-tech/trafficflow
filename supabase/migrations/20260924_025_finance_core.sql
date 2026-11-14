-- =========================================================
-- TRAFFIC FLOW
-- Migration 025
-- Finance Core
-- =========================================================


-- =========================================================
-- RESUMO FINANCEIRO
-- =========================================================

drop function if exists
  public.get_finance_summary(
    uuid,
    timestamptz,
    timestamptz,
    date,
    date
  );


create function public.get_finance_summary(
  p_project_id uuid,

  p_start timestamptz,

  p_end timestamptz,

  p_start_date date,

  p_end_date date
)
returns table (
  investment_brl numeric,

  impressions bigint,

  clicks bigint,

  approved_orders bigint,

  approved_revenue numeric,

  meta_attributed_orders bigint,

  meta_attributed_revenue numeric,

  average_ticket numeric,

  cpa numeric,

  roas numeric,

  ctr numeric,

  cpc numeric,

  cpm numeric,

  missing_fx_rows bigint
)
language sql
stable
security definer
set search_path = public
as $$

  with meta_metrics as (

    select

      coalesce(
        sum(
          case

            when ai.spend_brl
              is not null
            then
              ai.spend_brl

            when upper(
              coalesce(
                ai.currency,
                ''
              )
            ) = 'BRL'
            then
              ai.spend_native

            else
              0
          end
        ),
        0
      )::numeric
        as investment_brl,


      coalesce(
        sum(
          ai.impressions
        ),
        0
      )::bigint
        as impressions,


      coalesce(
        sum(
          ai.clicks
        ),
        0
      )::bigint
        as clicks,


      count(*) filter (
        where
          ai.spend_native > 0

          and ai.spend_brl
            is null

          and upper(
            coalesce(
              ai.currency,
              ''
            )
          ) <> 'BRL'
      )::bigint
        as missing_fx_rows


    from public.ad_insights_daily ai

    where
      ai.project_id =
        p_project_id

      -- IMPORTANTE:
      -- usamos campaign para não duplicar
      -- investimento, impressões e cliques.
      and ai.level =
        'campaign'

      and ai.metric_date >=
        p_start_date

      and ai.metric_date <=
        p_end_date
  ),


  sales_metrics as (

    select

      count(*)::bigint
        as approved_orders,


      coalesce(
        sum(
          oa.gross_amount
        ),
        0
      )::numeric
        as approved_revenue,


      count(*) filter (
        where
          oa.is_attributed =
            true

          and oa.campaign_id
            is not null
      )::bigint
        as meta_attributed_orders,


      coalesce(
        sum(
          oa.gross_amount
        ) filter (
          where
            oa.is_attributed =
              true

            and oa.campaign_id
              is not null
        ),
        0
      )::numeric
        as meta_attributed_revenue


    from public.order_attribution oa

    where
      oa.project_id =
        p_project_id

      and lower(
        trim(
          oa.order_status
        )
      ) =
        'paid'

      -- Receita entra no período
      -- pela data de pagamento.
      and oa.paid_at >=
        p_start

      and oa.paid_at <
        p_end
  )


  select

    mm.investment_brl,

    mm.impressions,

    mm.clicks,

    sm.approved_orders,

    sm.approved_revenue,

    sm.meta_attributed_orders,

    sm.meta_attributed_revenue,


    -- =====================================================
    -- TICKET MÉDIO
    -- =====================================================

    case
      when
        sm.approved_orders > 0
      then
        sm.approved_revenue /
        sm.approved_orders::numeric

      else
        0
    end
      as average_ticket,


    -- =====================================================
    -- CPA
    -- =====================================================
    --
    -- Investimento Meta /
    -- vendas pagas atribuídas à Meta.
    -- =====================================================

    case
      when
        sm.meta_attributed_orders > 0
      then
        mm.investment_brl /
        sm.meta_attributed_orders::numeric

      else
        0
    end
      as cpa,


    -- =====================================================
    -- ROAS
    -- =====================================================
    --
    -- Receita paga atribuída à Meta /
    -- investimento Meta.
    -- =====================================================

    case
      when
        mm.investment_brl > 0
      then
        sm.meta_attributed_revenue /
        mm.investment_brl

      else
        0
    end
      as roas,


    -- =====================================================
    -- CTR
    -- =====================================================

    case
      when
        mm.impressions > 0
      then
        (
          mm.clicks::numeric /
          mm.impressions::numeric
        ) * 100

      else
        0
    end
      as ctr,


    -- =====================================================
    -- CPC
    -- =====================================================

    case
      when
        mm.clicks > 0
      then
        mm.investment_brl /
        mm.clicks::numeric

      else
        0
    end
      as cpc,


    -- =====================================================
    -- CPM
    -- =====================================================

    case
      when
        mm.impressions > 0
      then
        (
          mm.investment_brl /
          mm.impressions::numeric
        ) * 1000

      else
        0
    end
      as cpm,


    mm.missing_fx_rows


  from meta_metrics mm

  cross join sales_metrics sm;
$$;



-- =========================================================
-- EVOLUÇÃO FINANCEIRA DIÁRIA
-- =========================================================

drop function if exists
  public.get_finance_daily(
    uuid,
    date,
    date,
    text
  );


create function public.get_finance_daily(
  p_project_id uuid,

  p_start_date date,

  p_end_date date,

  p_timezone text
)
returns table (
  metric_date date,

  investment_brl numeric,

  approved_revenue numeric,

  meta_attributed_revenue numeric,

  approved_orders bigint,

  meta_attributed_orders bigint
)
language sql
stable
security definer
set search_path = public
as $$

  with dates as (

    select
      generate_series(
        p_start_date::timestamp,
        p_end_date::timestamp,
        interval '1 day'
      )::date
        as metric_date
  ),


  meta_daily as (

    select

      ai.metric_date,


      coalesce(
        sum(
          case

            when ai.spend_brl
              is not null
            then
              ai.spend_brl

            when upper(
              coalesce(
                ai.currency,
                ''
              )
            ) = 'BRL'
            then
              ai.spend_native

            else
              0
          end
        ),
        0
      )::numeric
        as investment_brl


    from public.ad_insights_daily ai

    where
      ai.project_id =
        p_project_id

      and ai.level =
        'campaign'

      and ai.metric_date >=
        p_start_date

      and ai.metric_date <=
        p_end_date


    group by
      ai.metric_date
  ),


  sales_daily as (

    select

      (
        oa.paid_at
          at time zone
          p_timezone
      )::date
        as metric_date,


      count(*)::bigint
        as approved_orders,


      coalesce(
        sum(
          oa.gross_amount
        ),
        0
      )::numeric
        as approved_revenue,


      count(*) filter (
        where
          oa.is_attributed =
            true

          and oa.campaign_id
            is not null
      )::bigint
        as meta_attributed_orders,


      coalesce(
        sum(
          oa.gross_amount
        ) filter (
          where
            oa.is_attributed =
              true

            and oa.campaign_id
              is not null
        ),
        0
      )::numeric
        as meta_attributed_revenue


    from public.order_attribution oa

    where
      oa.project_id =
        p_project_id

      and lower(
        trim(
          oa.order_status
        )
      ) =
        'paid'

      and oa.paid_at
        is not null

      and (
        oa.paid_at
          at time zone
          p_timezone
      )::date >=
        p_start_date

      and (
        oa.paid_at
          at time zone
          p_timezone
      )::date <=
        p_end_date


    group by
      (
        oa.paid_at
          at time zone
          p_timezone
      )::date
  )


  select

    d.metric_date,


    coalesce(
      md.investment_brl,
      0
    )::numeric
      as investment_brl,


    coalesce(
      sd.approved_revenue,
      0
    )::numeric
      as approved_revenue,


    coalesce(
      sd.meta_attributed_revenue,
      0
    )::numeric
      as meta_attributed_revenue,


    coalesce(
      sd.approved_orders,
      0
    )::bigint
      as approved_orders,


    coalesce(
      sd.meta_attributed_orders,
      0
    )::bigint
      as meta_attributed_orders


  from dates d

  left join meta_daily md
    on md.metric_date =
      d.metric_date

  left join sales_daily sd
    on sd.metric_date =
      d.metric_date


  order by
    d.metric_date asc;
$$;



-- =========================================================
-- PERMISSÕES — RESUMO
-- =========================================================

revoke all
on function public.get_finance_summary(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date
)
from public;


revoke all
on function public.get_finance_summary(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date
)
from anon;


revoke all
on function public.get_finance_summary(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date
)
from authenticated;


grant execute
on function public.get_finance_summary(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date
)
to service_role;



-- =========================================================
-- PERMISSÕES — DIÁRIO
-- =========================================================

revoke all
on function public.get_finance_daily(
  uuid,
  date,
  date,
  text
)
from public;


revoke all
on function public.get_finance_daily(
  uuid,
  date,
  date,
  text
)
from anon;


revoke all
on function public.get_finance_daily(
  uuid,
  date,
  date,
  text
)
from authenticated;


grant execute
on function public.get_finance_daily(
  uuid,
  date,
  date,
  text
)
to service_role;