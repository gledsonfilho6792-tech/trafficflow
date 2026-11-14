-- =========================================================
-- TRAFFIC FLOW
-- Migration 027
-- Finance Performance by Ad Set / Ad
-- =========================================================


drop function if exists
  public.get_finance_meta_entities(
    uuid,
    timestamptz,
    timestamptz,
    date,
    date,
    text
  );


create function public.get_finance_meta_entities(
  p_project_id uuid,

  p_start timestamptz,

  p_end timestamptz,

  p_start_date date,

  p_end_date date,

  p_level text
)
returns table (
  entity_level text,

  entity_id uuid,

  entity_external_id text,

  entity_name text,


  campaign_id uuid,

  campaign_external_id text,

  campaign_name text,


  ad_set_id uuid,

  ad_set_external_id text,

  ad_set_name text,


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
language plpgsql
stable
security definer
set search_path = public
as $$
begin

  -- =======================================================
  -- VALIDAR NÍVEL
  -- =======================================================

  if p_level not in (
    'adset',
    'ad'
  ) then
    raise exception
      'p_level deve ser adset ou ad';
  end if;


  return query

  with

  -- =======================================================
  -- META — LINHAS BASE
  -- =======================================================

  meta_base as (

    select

      p_level
        as entity_level,


      case
        when p_level = 'adset'
        then
          coalesce(
            ai.ad_set_id,
            aset.id
          )

        else
          coalesce(
            ai.ad_id,
            a.id
          )
      end
        as entity_id,


      ai.external_id
        as entity_external_id,


      case
        when p_level = 'adset'
        then
          coalesce(
            aset.name,
            ai.external_id
          )

        else
          coalesce(
            a.name,
            ai.external_id
          )
      end
        as entity_name,


      coalesce(
        ai.campaign_id,
        aset.campaign_id,
        a.campaign_id
      )
        as campaign_id,


      c.external_id
        as campaign_external_id,


      c.name
        as campaign_name,


      case
        when p_level = 'adset'
        then
          coalesce(
            ai.ad_set_id,
            aset.id
          )

        else
          coalesce(
            ai.ad_set_id,
            a.ad_set_id,
            aset.id
          )
      end
        as ad_set_id,


      case
        when p_level = 'adset'
        then
          ai.external_id

        else
          aset.external_id
      end
        as ad_set_external_id,


      aset.name
        as ad_set_name,


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
        as investment_brl,


      ai.impressions,

      ai.clicks,


      case
        when
          ai.spend_native > 0

          and ai.spend_brl
            is null

          and upper(
            coalesce(
              ai.currency,
              ''
            )
          ) <> 'BRL'
        then
          1

        else
          0
      end
        as missing_fx_row


    from public.ad_insights_daily ai


    left join public.ad_sets aset
      on aset.id =
        ai.ad_set_id


    left join public.ads a
      on a.id =
        ai.ad_id


    left join public.campaigns c
      on c.id =
        coalesce(
          ai.campaign_id,
          aset.campaign_id,
          a.campaign_id
        )


    where
      ai.project_id =
        p_project_id

      and ai.level =
        p_level

      and ai.metric_date >=
        p_start_date

      and ai.metric_date <=
        p_end_date
  ),


  -- =======================================================
  -- META — AGREGADO
  -- =======================================================

  meta_entities as (

    select

      mb.entity_level,

      mb.entity_id,

      mb.entity_external_id,

      mb.entity_name,

      mb.campaign_id,

      mb.campaign_external_id,

      mb.campaign_name,

      mb.ad_set_id,

      mb.ad_set_external_id,

      mb.ad_set_name,


      coalesce(
        sum(
          mb.investment_brl
        ),
        0
      )::numeric
        as investment_brl,


      coalesce(
        sum(
          mb.impressions
        ),
        0
      )::bigint
        as impressions,


      coalesce(
        sum(
          mb.clicks
        ),
        0
      )::bigint
        as clicks,


      coalesce(
        sum(
          mb.missing_fx_row
        ),
        0
      )::bigint
        as missing_fx_rows


    from meta_base mb


    group by
      mb.entity_level,

      mb.entity_id,

      mb.entity_external_id,

      mb.entity_name,

      mb.campaign_id,

      mb.campaign_external_id,

      mb.campaign_name,

      mb.ad_set_id,

      mb.ad_set_external_id,

      mb.ad_set_name
  ),


  -- =======================================================
  -- VENDAS — BASE
  -- =======================================================

  sales_base as (

    select

      p_level
        as entity_level,


      case
        when p_level = 'adset'
        then
          oa.ad_set_id

        else
          oa.ad_id
      end
        as entity_id,


      case
        when p_level = 'adset'
        then
          oa.ad_set_external_id

        else
          oa.ad_external_id
      end
        as entity_external_id,


      case
        when p_level = 'adset'
        then
          oa.ad_set_name

        else
          oa.ad_name
      end
        as entity_name,


      oa.campaign_id,

      oa.campaign_external_id,

      oa.campaign_name,


      oa.ad_set_id,

      oa.ad_set_external_id,

      oa.ad_set_name,


      oa.gross_amount


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

      and oa.paid_at >=
        p_start

      and oa.paid_at <
        p_end


      and (
        (
          p_level = 'adset'

          and (
            oa.ad_set_id
              is not null

            or oa.ad_set_external_id
              is not null
          )
        )

        or

        (
          p_level = 'ad'

          and (
            oa.ad_id
              is not null

            or oa.ad_external_id
              is not null
          )
        )
      )
  ),


  -- =======================================================
  -- VENDAS — AGREGADO
  -- =======================================================

  sales_entities as (

    select

      sb.entity_level,

      sb.entity_id,

      sb.entity_external_id,

      sb.entity_name,

      sb.campaign_id,

      sb.campaign_external_id,

      sb.campaign_name,

      sb.ad_set_id,

      sb.ad_set_external_id,

      sb.ad_set_name,


      count(*)::bigint
        as attributed_orders,


      coalesce(
        sum(
          sb.gross_amount
        ),
        0
      )::numeric
        as attributed_revenue


    from sales_base sb


    group by
      sb.entity_level,

      sb.entity_id,

      sb.entity_external_id,

      sb.entity_name,

      sb.campaign_id,

      sb.campaign_external_id,

      sb.campaign_name,

      sb.ad_set_id,

      sb.ad_set_external_id,

      sb.ad_set_name
  ),


  -- =======================================================
  -- NORMALIZAR CHAVES
  -- =======================================================

  meta_normalized as (

    select
      me.*,


      coalesce(
        me.entity_external_id,
        me.entity_id::text
      )
        as entity_key


    from meta_entities me
  ),


  sales_normalized as (

    select
      se.*,


      coalesce(
        se.entity_external_id,
        se.entity_id::text
      )
        as entity_key


    from sales_entities se
  ),


  -- =======================================================
  -- UNIR META + VENDAS
  -- =======================================================

  combined as (

    select

      coalesce(
        m.entity_level,
        s.entity_level
      )
        as entity_level,


      coalesce(
        m.entity_id,
        s.entity_id
      )
        as entity_id,


      coalesce(
        m.entity_external_id,
        s.entity_external_id
      )
        as entity_external_id,


      coalesce(
        m.entity_name,
        s.entity_name,
        m.entity_external_id,
        s.entity_external_id
      )
        as entity_name,


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
        s.campaign_name
      )
        as campaign_name,


      coalesce(
        m.ad_set_id,
        s.ad_set_id
      )
        as ad_set_id,


      coalesce(
        m.ad_set_external_id,
        s.ad_set_external_id
      )
        as ad_set_external_id,


      coalesce(
        m.ad_set_name,
        s.ad_set_name
      )
        as ad_set_name,


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
      on s.entity_key =
        m.entity_key
  )


  -- =======================================================
  -- RESULTADO FINAL
  -- =======================================================

  select

    c.entity_level,

    c.entity_id,

    c.entity_external_id,

    c.entity_name,

    c.campaign_id,

    c.campaign_external_id,

    c.campaign_name,

    c.ad_set_id,

    c.ad_set_external_id,

    c.ad_set_name,

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


  where
    c.entity_external_id
      is not null

    or c.entity_id
      is not null


  order by
    c.investment_brl desc,

    c.attributed_revenue desc,

    c.entity_name asc;

end;
$$;



-- =========================================================
-- PERMISSÕES
-- =========================================================

revoke all
on function public.get_finance_meta_entities(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date,
  text
)
from public;


revoke all
on function public.get_finance_meta_entities(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date,
  text
)
from anon;


revoke all
on function public.get_finance_meta_entities(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date,
  text
)
from authenticated;


grant execute
on function public.get_finance_meta_entities(
  uuid,
  timestamptz,
  timestamptz,
  date,
  date,
  text
)
to service_role;