-- =========================================================
-- TRAFFIC FLOW
-- Migration 023
-- Sales Advanced Filters
-- =========================================================


-- =========================================================
-- RESUMO FILTRADO
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


      -- ===============================================
      -- STATUS
      -- ===============================================

      and (
        p_status is null

        or trim(p_status) = ''

        or lower(
          trim(p_status)
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


      -- ===============================================
      -- CHECKOUT / PROVIDER
      -- ===============================================

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


      -- ===============================================
      -- PAGAMENTO
      -- ===============================================

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


      -- ===============================================
      -- ATRIBUIÇÃO
      -- ===============================================

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
            'unattributed'

          and oa.is_attributed =
            false
        )
      )


      -- ===============================================
      -- CAMPANHA
      -- ===============================================

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


      -- ===============================================
      -- OFERTA
      -- ===============================================

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


      -- ===============================================
      -- BUSCA
      -- ===============================================

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
-- OPÇÕES DOS FILTROS
-- =========================================================

drop function if exists
  public.get_sales_filter_options(
    uuid,
    timestamptz,
    timestamptz
  );


create function public.get_sales_filter_options(
  p_project_id uuid,

  p_start timestamptz,

  p_end timestamptz
)
returns table (
  payment_methods text[],

  campaigns text[],

  offers text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select

    coalesce(
      array_agg(
        distinct oa.payment_method
        order by oa.payment_method
      ) filter (
        where
          oa.payment_method
            is not null

          and trim(
            oa.payment_method
          ) <> ''
      ),
      array[]::text[]
    )
      as payment_methods,


    coalesce(
      array_agg(
        distinct oa.campaign_name
        order by oa.campaign_name
      ) filter (
        where
          oa.campaign_name
            is not null

          and trim(
            oa.campaign_name
          ) <> ''
      ),
      array[]::text[]
    )
      as campaigns,


    coalesce(
      array_agg(
        distinct oa.offer_code
        order by oa.offer_code
      ) filter (
        where
          oa.offer_code
            is not null

          and trim(
            oa.offer_code
          ) <> ''
      ),
      array[]::text[]
    )
      as offers


  from public.order_attribution oa

  where
    oa.project_id =
      p_project_id

    and oa.order_created_at >=
      p_start

    and oa.order_created_at <
      p_end;
$$;



-- =========================================================
-- PERMISSÕES — RESUMO FILTRADO
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



-- =========================================================
-- PERMISSÕES — OPÇÕES DOS FILTROS
-- =========================================================

revoke all
on function public.get_sales_filter_options(
  uuid,
  timestamptz,
  timestamptz
)
from public;


revoke all
on function public.get_sales_filter_options(
  uuid,
  timestamptz,
  timestamptz
)
from anon;


revoke all
on function public.get_sales_filter_options(
  uuid,
  timestamptz,
  timestamptz
)
from authenticated;


grant execute
on function public.get_sales_filter_options(
  uuid,
  timestamptz,
  timestamptz
)
to service_role;