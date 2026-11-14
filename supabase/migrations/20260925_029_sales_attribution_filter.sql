-- =========================================================
-- TRAFFIC FLOW
-- Migration 029
-- Sales Attribution Status Filter
-- =========================================================
--
-- Objetivo:
--
-- Separar oficialmente:
--
-- attributed
-- token_pending
-- unattributed
--
-- em:
--
-- - resumo
-- - análise
-- - filtros
--
-- A assinatura das funções continua igual.
-- O retorno do resumo ganha token_pending.
-- =========================================================


-- =========================================================
-- 1. RESUMO FILTRADO
-- =========================================================

drop function if exists
  public.get_sales_summary_filtered(
    uuid,
    timestamptz,
    timestamptz,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  );


create function public.get_sales_summary_filtered(
  p_project_id uuid,

  p_start timestamptz,

  p_end timestamptz,

  p_status text
    default null,

  p_provider text
    default null,

  p_payment_method text
    default null,

  p_attribution text
    default null,

  p_campaign text
    default null,

  p_offer text
    default null,

  p_search text
    default null
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

  token_pending bigint,

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

  with filtered_orders as (

    select
      oa.*

    from public.order_attribution oa

    where
      oa.project_id =
        p_project_id

      and oa.order_created_at >=
        p_start

      and oa.order_created_at <
        p_end


      -- ===================================================
      -- STATUS
      -- ===================================================

      and (
        p_status is null

        or trim(
          p_status
        ) = ''

        or lower(
          trim(
            p_status
          )
        ) = 'all'

        or lower(
          trim(
            oa.order_status
          )
        ) =
          lower(
            trim(
              p_status
            )
          )
      )


      -- ===================================================
      -- CHECKOUT
      -- ===================================================

      and (
        p_provider is null

        or trim(
          p_provider
        ) = ''

        or lower(
          trim(
            p_provider
          )
        ) = 'all'

        or lower(
          trim(
            oa.provider
          )
        ) =
          lower(
            trim(
              p_provider
            )
          )
      )


      -- ===================================================
      -- PAGAMENTO
      -- ===================================================

      and (
        p_payment_method is null

        or trim(
          p_payment_method
        ) = ''

        or lower(
          trim(
            p_payment_method
          )
        ) = 'all'

        or lower(
          trim(
            oa.payment_method
          )
        ) =
          lower(
            trim(
              p_payment_method
            )
          )
      )


      -- ===================================================
      -- ATRIBUIÇÃO
      -- ===================================================
      --
      -- attributed
      --   sessão resolvida
      --
      -- token_pending
      --   token recebido, sessão ainda não resolvida
      --
      -- unattributed
      --   sem atribuição e sem token pendente
      -- ===================================================

      and (
        p_attribution is null

        or trim(
          p_attribution
        ) = ''

        or lower(
          trim(
            p_attribution
          )
        ) = 'all'


        or (
          lower(
            trim(
              p_attribution
            )
          ) =
            'attributed'

          and oa.is_attributed =
            true
        )


        or (
          lower(
            trim(
              p_attribution
            )
          ) =
            'token_pending'

          and coalesce(
            oa.is_attributed,
            false
          ) =
            false

          and lower(
            trim(
              coalesce(
                oa.attribution_status,
                ''
              )
            )
          ) =
            'token_unresolved'
        )


        or (
          lower(
            trim(
              p_attribution
            )
          ) =
            'unattributed'

          and coalesce(
            oa.is_attributed,
            false
          ) =
            false

          and lower(
            trim(
              coalesce(
                oa.attribution_status,
                ''
              )
            )
          ) <>
            'token_unresolved'
        )
      )


      -- ===================================================
      -- CAMPANHA
      -- ===================================================

      and (
        p_campaign is null

        or trim(
          p_campaign
        ) = ''

        or lower(
          trim(
            p_campaign
          )
        ) = 'all'

        or oa.campaign_name =
          p_campaign
      )


      -- ===================================================
      -- OFERTA
      -- ===================================================

      and (
        p_offer is null

        or trim(
          p_offer
        ) = ''

        or lower(
          trim(
            p_offer
          )
        ) = 'all'

        or oa.offer_code =
          p_offer
      )


      -- ===================================================
      -- BUSCA
      -- ===================================================

      and (
        p_search is null

        or trim(
          p_search
        ) = ''

        or oa.external_order_id
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'

        or oa.external_transaction_id
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'

        or oa.transaction_identifier
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'

        or oa.customer_name
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'

        or oa.customer_email
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'
      )
  ),


  metrics as (

    select

      count(*)::bigint
        as total_orders,


      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'paid'
      )::bigint
        as approved,


      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'pending'
      )::bigint
        as pending,


      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'refunded'
      )::bigint
        as refunded,


      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'chargeback'
      )::bigint
        as chargebacks,


      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'canceled'
      )::bigint
        as canceled,


      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'disputed'
      )::bigint
        as disputed,


      count(*) filter (
        where
          is_attributed =
            true
      )::bigint
        as attributed,


      count(*) filter (
        where
          coalesce(
            is_attributed,
            false
          ) =
            false

          and lower(
            trim(
              coalesce(
                attribution_status,
                ''
              )
            )
          ) =
            'token_unresolved'
      )::bigint
        as token_pending,


      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'paid'

          and is_attributed =
            true
      )::bigint
        as approved_attributed,


      coalesce(
        sum(
          gross_amount
        ) filter (
          where
            lower(
              trim(
                order_status
              )
            ) =
              'paid'
        ),
        0
      )::numeric
        as approved_revenue,


      coalesce(
        sum(
          gross_amount
        ) filter (
          where
            lower(
              trim(
                order_status
              )
            ) =
              'paid'

            and is_attributed =
              true
        ),
        0
      )::numeric
        as attributed_revenue

    from filtered_orders
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

    m.token_pending,

    m.approved_attributed,

    m.approved_revenue,

    m.attributed_revenue,


    case
      when
        m.total_orders > 0
      then
        (
          m.approved::numeric /
          m.total_orders::numeric
        ) * 100

      else 0
    end
      as approval_rate,


    case
      when
        m.total_orders > 0
      then
        (
          m.attributed::numeric /
          m.total_orders::numeric
        ) * 100

      else 0
    end
      as attribution_rate,


    case
      when
        m.approved > 0
      then
        (
          m.approved_revenue /
          m.approved::numeric
        )

      else 0
    end
      as average_ticket

  from metrics m;
$$;



-- =========================================================
-- 2. ANÁLISE FILTRADA
-- =========================================================

drop function if exists
  public.get_sales_analysis_filtered(
    uuid,
    timestamptz,
    timestamptz,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  );


create function public.get_sales_analysis_filtered(
  p_project_id uuid,

  p_start timestamptz,

  p_end timestamptz,

  p_status text
    default null,

  p_provider text
    default null,

  p_payment_method text
    default null,

  p_attribution text
    default null,

  p_campaign text
    default null,

  p_offer text
    default null,

  p_search text
    default null
)
returns table (
  payment_methods jsonb,
  providers jsonb,
  statuses jsonb,
  campaigns jsonb,
  attribution jsonb
)
language sql
stable
security definer
set search_path = public
as $$

  with filtered_orders as (

    select
      oa.*

    from public.order_attribution oa

    where
      oa.project_id =
        p_project_id

      and oa.order_created_at >=
        p_start

      and oa.order_created_at <
        p_end


      -- ===================================================
      -- STATUS
      -- ===================================================

      and (
        p_status is null

        or trim(
          p_status
        ) = ''

        or lower(
          trim(
            p_status
          )
        ) = 'all'

        or lower(
          trim(
            oa.order_status
          )
        ) =
          lower(
            trim(
              p_status
            )
          )
      )


      -- ===================================================
      -- CHECKOUT
      -- ===================================================

      and (
        p_provider is null

        or trim(
          p_provider
        ) = ''

        or lower(
          trim(
            p_provider
          )
        ) = 'all'

        or lower(
          trim(
            oa.provider
          )
        ) =
          lower(
            trim(
              p_provider
            )
          )
      )


      -- ===================================================
      -- PAGAMENTO
      -- ===================================================

      and (
        p_payment_method is null

        or trim(
          p_payment_method
        ) = ''

        or lower(
          trim(
            p_payment_method
          )
        ) = 'all'

        or lower(
          trim(
            oa.payment_method
          )
        ) =
          lower(
            trim(
              p_payment_method
            )
          )
      )


      -- ===================================================
      -- ATRIBUIÇÃO
      -- ===================================================

      and (
        p_attribution is null

        or trim(
          p_attribution
        ) = ''

        or lower(
          trim(
            p_attribution
          )
        ) = 'all'


        or (
          lower(
            trim(
              p_attribution
            )
          ) =
            'attributed'

          and oa.is_attributed =
            true
        )


        or (
          lower(
            trim(
              p_attribution
            )
          ) =
            'token_pending'

          and coalesce(
            oa.is_attributed,
            false
          ) =
            false

          and lower(
            trim(
              coalesce(
                oa.attribution_status,
                ''
              )
            )
          ) =
            'token_unresolved'
        )


        or (
          lower(
            trim(
              p_attribution
            )
          ) =
            'unattributed'

          and coalesce(
            oa.is_attributed,
            false
          ) =
            false

          and lower(
            trim(
              coalesce(
                oa.attribution_status,
                ''
              )
            )
          ) <>
            'token_unresolved'
        )
      )


      -- ===================================================
      -- CAMPANHA
      -- ===================================================

      and (
        p_campaign is null

        or trim(
          p_campaign
        ) = ''

        or lower(
          trim(
            p_campaign
          )
        ) = 'all'

        or oa.campaign_name =
          p_campaign
      )


      -- ===================================================
      -- OFERTA
      -- ===================================================

      and (
        p_offer is null

        or trim(
          p_offer
        ) = ''

        or lower(
          trim(
            p_offer
          )
        ) = 'all'

        or oa.offer_code =
          p_offer
      )


      -- ===================================================
      -- BUSCA
      -- ===================================================

      and (
        p_search is null

        or trim(
          p_search
        ) = ''

        or oa.external_order_id
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'

        or oa.external_transaction_id
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'

        or oa.transaction_identifier
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'

        or oa.customer_name
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'

        or oa.customer_email
          ilike
          '%' ||
          trim(
            p_search
          ) ||
          '%'
      )
  ),


  -- =======================================================
  -- PAGAMENTO
  -- =======================================================

  payment_breakdown as (

    select
      coalesce(
        nullif(
          lower(
            trim(
              payment_method
            )
          ),
          ''
        ),
        'unknown'
      )
        as key,

      count(*)::bigint
        as orders,

      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'paid'
      )::bigint
        as approved,

      coalesce(
        sum(
          gross_amount
        ) filter (
          where
            lower(
              trim(
                order_status
              )
            ) =
              'paid'
        ),
        0
      )::numeric
        as revenue

    from filtered_orders

    group by 1
  ),


  -- =======================================================
  -- CHECKOUTS
  -- =======================================================

  provider_breakdown as (

    select
      coalesce(
        nullif(
          lower(
            trim(
              provider
            )
          ),
          ''
        ),
        'unknown'
      )
        as key,

      count(*)::bigint
        as orders,

      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'paid'
      )::bigint
        as approved,

      coalesce(
        sum(
          gross_amount
        ) filter (
          where
            lower(
              trim(
                order_status
              )
            ) =
              'paid'
        ),
        0
      )::numeric
        as revenue

    from filtered_orders

    group by 1
  ),


  -- =======================================================
  -- STATUS
  -- =======================================================

  status_breakdown as (

    select
      coalesce(
        nullif(
          lower(
            trim(
              order_status
            )
          ),
          ''
        ),
        'unknown'
      )
        as key,

      count(*)::bigint
        as orders,

      coalesce(
        sum(
          gross_amount
        ),
        0
      )::numeric
        as gross_value

    from filtered_orders

    group by 1
  ),


  -- =======================================================
  -- CAMPANHAS
  -- =======================================================

  campaign_breakdown as (

    select
      campaign_name
        as name,

      campaign_external_id
        as external_id,

      count(*)::bigint
        as orders,

      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'paid'
      )::bigint
        as approved,

      coalesce(
        sum(
          gross_amount
        ) filter (
          where
            lower(
              trim(
                order_status
              )
            ) =
              'paid'
        ),
        0
      )::numeric
        as revenue

    from filtered_orders

    where
      campaign_name
        is not null

      and trim(
        campaign_name
      ) <> ''

    group by
      campaign_name,
      campaign_external_id
  ),


  -- =======================================================
  -- ATRIBUIÇÃO
  -- =======================================================
  --
  -- Agora são três grupos mutuamente exclusivos.
  -- =======================================================

  attribution_breakdown as (

    select
      case

        when
          is_attributed =
            true
        then
          'attributed'


        when
          lower(
            trim(
              coalesce(
                attribution_status,
                ''
              )
            )
          ) =
            'token_unresolved'
        then
          'token_pending'


        else
          'unattributed'

      end
        as key,

      count(*)::bigint
        as orders,

      count(*) filter (
        where
          lower(
            trim(
              order_status
            )
          ) =
            'paid'
      )::bigint
        as approved,

      coalesce(
        sum(
          gross_amount
        ) filter (
          where
            lower(
              trim(
                order_status
              )
            ) =
              'paid'
        ),
        0
      )::numeric
        as revenue

    from filtered_orders

    group by 1
  )


  select

    coalesce(
      (
        select
          jsonb_agg(
            jsonb_build_object(
              'key',
                pb.key,

              'orders',
                pb.orders,

              'approved',
                pb.approved,

              'revenue',
                pb.revenue
            )

            order by
              pb.orders desc,
              pb.key asc
          )

        from payment_breakdown pb
      ),

      '[]'::jsonb
    )
      as payment_methods,


    coalesce(
      (
        select
          jsonb_agg(
            jsonb_build_object(
              'key',
                pb.key,

              'orders',
                pb.orders,

              'approved',
                pb.approved,

              'revenue',
                pb.revenue
            )

            order by
              pb.orders desc,
              pb.key asc
          )

        from provider_breakdown pb
      ),

      '[]'::jsonb
    )
      as providers,


    coalesce(
      (
        select
          jsonb_agg(
            jsonb_build_object(
              'key',
                sb.key,

              'orders',
                sb.orders,

              'grossValue',
                sb.gross_value
            )

            order by
              sb.orders desc,
              sb.key asc
          )

        from status_breakdown sb
      ),

      '[]'::jsonb
    )
      as statuses,


    coalesce(
      (
        select
          jsonb_agg(
            jsonb_build_object(
              'name',
                cb.name,

              'externalId',
                cb.external_id,

              'orders',
                cb.orders,

              'approved',
                cb.approved,

              'revenue',
                cb.revenue
            )

            order by
              cb.orders desc,
              cb.name asc
          )

        from campaign_breakdown cb
      ),

      '[]'::jsonb
    )
      as campaigns,


    coalesce(
      (
        select
          jsonb_agg(
            jsonb_build_object(
              'key',
                ab.key,

              'orders',
                ab.orders,

              'approved',
                ab.approved,

              'revenue',
                ab.revenue
            )

            order by
              ab.orders desc,
              ab.key asc
          )

        from attribution_breakdown ab
      ),

      '[]'::jsonb
    )
      as attribution;
$$;



-- =========================================================
-- 3. PERMISSÕES
-- =========================================================

revoke all
on function public.get_sales_summary_filtered(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from public;


revoke all
on function public.get_sales_summary_filtered(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from anon;


revoke all
on function public.get_sales_summary_filtered(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from authenticated;


grant execute
on function public.get_sales_summary_filtered(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to service_role;



revoke all
on function public.get_sales_analysis_filtered(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from public;


revoke all
on function public.get_sales_analysis_filtered(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from anon;


revoke all
on function public.get_sales_analysis_filtered(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from authenticated;


grant execute
on function public.get_sales_analysis_filtered(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to service_role;