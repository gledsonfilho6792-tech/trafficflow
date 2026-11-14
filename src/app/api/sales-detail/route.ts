import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createClient,
} from '@/lib/supabase/server'

import {
  createAdminClient,
} from '@/lib/supabase/admin'


export const dynamic =
  'force-dynamic'


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


export async function GET(
  request: NextRequest
) {
  try {
    const projectId =
      request.nextUrl
        .searchParams
        .get('projectId')


    const orderId =
      request.nextUrl
        .searchParams
        .get('orderId')


    if (
      !projectId ||
      !isUuid(projectId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'projectId inválido.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      !orderId ||
      !isUuid(orderId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'orderId inválido.',
        },
        {
          status: 400,
        }
      )
    }


    /*
     * =====================================================
     * AUTENTICAÇÃO
     * =====================================================
     */

    const supabase =
      await createClient()


    const {
      data: {
        user,
      },

      error:
        userError,
    } =
      await supabase
        .auth
        .getUser()


    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Não autorizado.',
        },
        {
          status: 401,
        }
      )
    }


    /*
     * A própria RLS do projeto
     * determina se o usuário pode vê-lo.
     */

    const {
      data: project,

      error:
        projectError,
    } =
      await supabase
        .from('projects')
        .select(
          `
          id,
          name,
          timezone,
          base_currency
          `
        )
        .eq(
          'id',
          projectId
        )
        .maybeSingle()


    if (
      projectError ||
      !project
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Projeto não encontrado.',
        },
        {
          status: 404,
        }
      )
    }


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * PEDIDO + ATRIBUIÇÃO + TIMELINE
     * =====================================================
     */

    const [
      orderResult,
      attributionResult,
      eventsResult,
    ] =
      await Promise.all([
        admin
          .from('orders')
          .select(
            `
            id,
            project_id,
            integration_id,
            provider,

            external_order_id,
            external_transaction_id,
            transaction_identifier,

            status,
            currency,

            gross_amount,
            net_amount,

            payment_method,
            installments,
            offer_code,

            paid_at,
            provider_created_at,

            customer_external_id,
            customer_name,
            customer_email,
            customer_phone,

            customer_country,
            customer_state,
            customer_city,

            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,

            session_id,
            visitor_id,

            fbclid,

            subscription_external_id,
            subscription_status,

            charge_amount,
            commission_amount,

            original_amount,
            original_currency,
            exchange_rate,

            dispute_id,
            dispute_type,
            dispute_status,
            dispute_amount,
            dispute_fine_amount,
            dispute_origin,
            dispute_details,
            dispute_updated_at,

            tracking_session_id,
            tracking_source_id,

            attribution_token,
            attribution_method,
            attributed_at,

            created_at,
            updated_at
            `
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'id',
            orderId
          )
          .maybeSingle(),

        admin
          .from(
            'order_attribution'
          )
          .select(
            `
            order_id,
            project_id,

            is_attributed,
            attribution_status,
            attribution_method,
            attribution_token,
            attributed_at,

            tracking_session_id,
            tracking_source_id,

            session_id,
            visitor_id,

            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,

            campaign_id,
            ad_set_id,
            ad_id,

            campaign_external_id,
            campaign_name,

            ad_set_external_id,
            ad_set_name,

            ad_external_id,
            ad_name,

            meta_placement,
            meta_site_source
            `
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'order_id',
            orderId
          )
          .maybeSingle(),

        admin
          .from(
            'order_events'
          )
          .select(
            `
            id,
            provider,
            event_type,
            external_event_id,
            normalized_status,
            event_at,
            created_at
            `
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'order_id',
            orderId
          )
          .order(
            'event_at',
            {
              ascending:
                true,
            }
          ),
      ])


    if (
      orderResult.error
    ) {
      throw new Error(
        orderResult
          .error
          .message
      )
    }


    if (
      attributionResult.error
    ) {
      throw new Error(
        attributionResult
          .error
          .message
      )
    }


    if (
      eventsResult.error
    ) {
      throw new Error(
        eventsResult
          .error
          .message
      )
    }


    const order =
      orderResult.data


    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Pedido não encontrado.',
        },
        {
          status: 404,
        }
      )
    }


    const attribution =
      attributionResult.data


    /*
     * =====================================================
     * SESSÃO DE TRACKING
     * =====================================================
     */

    let trackingSession:
      Record<
        string,
        unknown
      > | null =
      null


    if (
      order.tracking_session_id
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            'tracking_sessions'
          )
          .select(
            `
            id,

            tracking_source_id,

            visitor_id,
            session_id,

            started_at,
            last_seen_at,

            landing_url,
            referrer,

            country,
            region,
            city,

            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,

            fbclid,
            fbp,
            fbc,

            gclid,
            ttclid,

            meta_campaign_external_id,
            meta_ad_set_external_id,
            meta_ad_external_id,

            meta_placement,
            meta_site_source,

            campaign_id,
            ad_set_id,
            ad_id
            `
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'id',
            order.tracking_session_id
          )
          .maybeSingle()


      if (error) {
        throw new Error(
          error.message
        )
      }


      trackingSession =
        data ?? null
    }


    /*
     * =====================================================
     * FONTE
     * =====================================================
     */

    let trackingSource:
      Record<
        string,
        unknown
      > | null =
      null


    if (
      order.tracking_source_id
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            'tracking_sources'
          )
          .select(
            `
            id,
            name,
            domain,
            is_active
            `
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'id',
            order.tracking_source_id
          )
          .maybeSingle()


      if (error) {
        throw new Error(
          error.message
        )
      }


      trackingSource =
        data ?? null
    }


    return NextResponse.json({
      ok: true,

      project: {
        id:
          project.id,

        name:
          project.name,

        timezone:
          project.timezone,

        currency:
          project.base_currency ??
          'BRL',
      },

      order,

      attribution:
        attribution ?? null,

      tracking: {
        session:
          trackingSession,

        source:
          trackingSource,
      },

      events:
        eventsResult.data ??
        [],

      generatedAt:
        new Date()
          .toISOString(),
    })
  } catch (error) {
    console.error(
      'SALES DETAIL API ERROR:',
      error
    )


    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado.',
      },
      {
        status: 500,
      }
    )
  }
}