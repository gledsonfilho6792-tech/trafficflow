-- =========================================================
-- TRAFFIC FLOW
-- Migration 026
-- Finance Performance by Campaign
-- =========================================================


drop function if exists
  public.get_finance_campaigns(
    uuid,
    timestamptz,
    timestamptz,
    date,
    date
  );


create function public.get_finance_campaigns(
  p_project_id uuid,

  p_start timestamptz,

  p_end timestamptz,

  p_start_date date,

  p_end_date date
)
returns table (
  campaign_id uuid,

  campaign_external_id text,

  campaign_name text,

  investment_brl numeric,

  impressions bigint,

  clicks bigint,

  attributed_orders bigint,

  attributed_revenue numeric,

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

  -- =======================================================
  -- META ADS
  -- =======================================================

  with meta_campaigns as (

    select

      coalesce(
        ai.campaign_id,
        c.id
      )
        as campaign_id,


      ai.external_id
        as campaign_external_id,


      coalesce(
        c.name,
        ai.external_id
      )
        as campaign_name,


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


    left join public.campaigns c
      on c.project_id =
        ai.project_id

      and c.external_id =
        ai.external_id


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
      coalesce(
        ai.campaign_id,
        c.id
      ),

      ai.external_id,

      coalesce(
        c.name,
        ai.external_id
      )
  ),


  -- =======================================================
  -- VENDAS PAGAS ATRIBUÍDAS À META
  -- =======================================================

  sales_campaigns as (

    select

      oa.campaign_id,


      oa.campaign_external_id,


      coalesce(
        oa.campaign_name,
        oa.campaign_external_id,
        oa.campaign_id::text
      )
        as campaign_name,


      count(*)::bigint
        as attributed_orders,


      coalesce(
        sum(
          oa.gross_amount
        ),
        0
      )::numeric
        as attributed_revenue


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

      and oa.is_attributed =
        true

      and (
        oa.campaign_id
          is not null

        or oa.campaign_external_id
          is not null
      )

      and oa.paid_at >=
        p_start

      and oa.paid_at <
        p_end


    group by
      oa.campaign_id,

      oa.campaign_external_id,

      coalesce(
        oa.campaign_name,
        oa.campaign_external_id,
        oa.campaign_id::text
      )
  ),


  -- =======================================================
  -- CHAVES NORMALIZADAS
  -- =======================================================

  meta_normalized as (

    select
      mc.*,

      coalesce(
        mc.campaign_external_id,
        mc.campaign_id::text
      )
        as campaign_key

    from meta_campaigns mc
  ),


  sales_normalized as (

    select
      sc.*,

      coalesce(
        sc.campaign_external_id,
        sc.campaign_id::text
      )
        as campaign_key

    from sales_campaigns sc
  ),


  -- =======================================================
  -- UNIR MÍDIA + VENDAS
  -- =======================================================

  combined as (

    select

      coalesce(
        m.campaign_id,
        s.campaign_id
      )
        as campaign_id,


      coalesce(
        m.campaign_external_id,
        s.campaign_external_id
      )
        as campaign_external_id,


      coalesce(
        m.campaign_name,
        s.campaign_name,
        m.campaign_external_id,
        s.campaign_external_id
      )
        as campaign_name,


      coalesce(
        m.investment_brl,
        0
      )::numeric
        as investment_brl,


      coalesce(
        m.impressions,
        0
      )::bigint
        as impressions,


      coalesce(
        m.clicks,
        0
      )::bigint
        as clicks,


      coalesce(
        s.attributed_orders,
        0
      )::bigint
        as attributed_orders,


      coalesce(
        s.attributed_revenue,
        0
      )::numeric
        as attributed_revenue,


      coalesce(
        m.missing_fx_rows,
        0
      )::bigint
        as missing_fx_rows


    from meta_normalized m


    full outer join sales_normalized s
      on s.campaign_key =
        m.campaign_key
  )


  select

    c.campaign_id,

    c.campaign_external_id,

    c.campaign_name,

    c.investment_brl,

    c.impressions,

    c.clicks,

    c.attributed_orders,

    c.attributed_revenue,


    -- =====================================================
    -- CPA
    -- =====================================================

    case
      when
        c.attributed_orders > 0
      then
        c.investment_brl /
        c.attributed_orders::numeric

      else
        0
    end
      as cpa,


    -- =====================================================
    -- ROAS
    -- =====================================================

    case
      when
        c.investment_brl > 0
      then
        c.attributed_revenue /
        c.investment_brl

      else
        0
    end
      as roas,


    -- =====================================================
    -- CTR
    -- =====================================================

    case
      when
        c.impressions > 0
      then
        (
          c.clicks::numeric /
          c.impressions::numeric
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
        c.clicks > 0
      then
        c.investment_brl /
        c.clicks::numeric

      else
        0
    end
      as cpc,


    -- =====================================================
    -- CPM
    -- =====================================================

    case
      when
        c.impressions > 0
      then
        (
          c.investment_brl /
          c.impressions::numeric
        ) * 1000

      else
        0
    end
      as cpm,


    c.missing_fx_rows


  from combined c


  order by
    c.investment_brl desc,
    c.attributed_revenue desc,
    c.campaign_name asc;
$$;



-- =========================================================
-- PERMISSÕES
-- =========================================================

revoke all
on function public.get_finance_campaigns(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date
)
from public;


revoke all
on function public.get_finance_campaigns(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date
)
from anon;


revoke all
on function public.get_finance_campaigns(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date
)
from authenticated;


grant execute
on function public.get_finance_campaigns(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date
)
to service_role;