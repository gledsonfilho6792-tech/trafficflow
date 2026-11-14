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

import { getTrackingDiagnostics } from '@/lib/tracking/diagnostics'


export const dynamic =
  'force-dynamic'


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


function ageInMinutes(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return null
  }


  const timestamp =
    new Date(
      value
    ).getTime()


  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return null
  }


  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        timestamp
      ) /
        60000
    )
  )
}


export async function GET(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * USUÁRIO
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
     * =====================================================
     * PROJECT ID
     * =====================================================
     */

    const projectId =
      request
        .nextUrl
        .searchParams
        .get(
          'projectId'
        )


    if (
      !projectId ||
      !isUuid(
        projectId
      )
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


    /*
     * =====================================================
     * PROJETO
     * =====================================================
     */

    const {
      data: project,

      error:
        projectError,
    } =
      await supabase
        .from(
          'projects'
        )
        .select(
          `
          id,
          name
          `
        )
        .eq(
          'id',
          projectId
        )
        .eq(
          'owner_id',
          user.id
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


    /*
     * Usuário + propriedade
     * já confirmados.
     */

    const admin =
      createAdminClient()


    const now =
      new Date()


    const since24h =
      new Date(
        now.getTime() -
        24 *
          60 *
          60 *
          1000
      ).toISOString()


    /*
     * =====================================================
     * TRACKING SOURCES
     * =====================================================
     */

    const {
      data:
        trackingSources,

      error:
        sourcesError,
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
          public_key,
          is_active,
          created_at,
          updated_at
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .order(
          'created_at',
          {
            ascending:
              true,
          }
        )


    if (
      sourcesError
    ) {
      throw new Error(
        sourcesError.message
      )
    }


    const sources =
      trackingSources ??
      []


    const hours = Number(request.nextUrl.searchParams.get('hours') ?? '24')
    const sourceId = request.nextUrl.searchParams.get('sourceId') || null
    if (![24, 168, 720].includes(hours) || (sourceId && !sources.some(source => source.id === sourceId))) {
      return NextResponse.json({ ok: false, error: 'Período ou fonte inválidos.' }, { status: 400 })
    }
    const diagnosticsPromise = getTrackingDiagnostics(
      admin, projectId,
      new Date(now.getTime() - hours * 3600000).toISOString(),
      now.toISOString(), sourceId
    )
    // Attach rejection handling immediately while the existing health checks run.
    const diagnosticsResult = diagnosticsPromise.then(
      value => ({ value, error: null }),
      error => ({ value: null, error })
    )

    const activeSources =
      sources.filter(
        (source) =>
          source.is_active
      )


    /*
     * =====================================================
     * CONTAGEM 24H
     * =====================================================
     */

    const [
      sessionsResult,
      eventsResult,
      pageViewsResult,
      checkoutEventsResult,
    ] =
      await Promise.all([
        admin
          .from(
            'tracking_sessions'
          )
          .select(
            'id',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'project_id',
            projectId
          )
          .gte(
            'started_at',
            since24h
          ),

        admin
          .from(
            'tracking_events'
          )
          .select(
            'id',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'project_id',
            projectId
          )
          .gte(
            'occurred_at',
            since24h
          ),

        admin
          .from(
            'tracking_events'
          )
          .select(
            'id',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'event_name',
            'page_view'
          )
          .gte(
            'occurred_at',
            since24h
          ),

        admin
          .from(
            'tracking_events'
          )
          .select(
            'id',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'event_name',
            'initiate_checkout'
          )
          .gte(
            'occurred_at',
            since24h
          ),
      ])


    if (
      sessionsResult.error
    ) {
      throw new Error(
        sessionsResult
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


    if (
      pageViewsResult.error
    ) {
      throw new Error(
        pageViewsResult
          .error
          .message
      )
    }


    if (
      checkoutEventsResult
        .error
    ) {
      throw new Error(
        checkoutEventsResult
          .error
          .message
      )
    }


    /*
     * =====================================================
     * ÚLTIMOS EVENTOS
     * =====================================================
     */

    const [
      latestEventResult,
      latestPageViewResult,
      latestCheckoutResult,
    ] =
      await Promise.all([
        admin
          .from(
            'tracking_events'
          )
          .select(
            `
            event_name,
            occurred_at,
            page_url
            `
          )
          .eq(
            'project_id',
            projectId
          )
          .order(
            'occurred_at',
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle(),

        admin
          .from(
            'tracking_events'
          )
          .select(
            `
            occurred_at,
            page_url
            `
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'event_name',
            'page_view'
          )
          .order(
            'occurred_at',
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle(),

        admin
          .from(
            'tracking_events'
          )
          .select(
            `
            occurred_at,
            page_url,
            metadata
            `
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'event_name',
            'initiate_checkout'
          )
          .order(
            'occurred_at',
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle(),
      ])


    if (
      latestEventResult.error
    ) {
      throw new Error(
        latestEventResult
          .error
          .message
      )
    }


    if (
      latestPageViewResult
        .error
    ) {
      throw new Error(
        latestPageViewResult
          .error
          .message
      )
    }


    if (
      latestCheckoutResult
        .error
    ) {
      throw new Error(
        latestCheckoutResult
          .error
          .message
      )
    }


    /*
     * =====================================================
     * CHECKOUT INTEGRATIONS
     * =====================================================
     */

    const {
      data:
        checkoutIntegrations,

      error:
        checkoutIntegrationsError,
    } =
      await admin
        .from(
          'integrations'
        )
        .select(
          `
          id,
          provider,
          status,
          updated_at
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'integration_type',
          'checkout'
        )


    if (
      checkoutIntegrationsError
    ) {
      throw new Error(
        checkoutIntegrationsError
          .message
      )
    }


    /*
     * =====================================================
     * WEBHOOK
     * =====================================================
     */

    const {
      data:
        latestWebhook,

      error:
        latestWebhookError,
    } =
      await admin
        .from(
          'webhook_events'
        )
        .select(
          `
          provider,
          event_type,
          status,
          received_at,
          processed_at,
          error_message
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .order(
          'received_at',
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle()


    if (
      latestWebhookError
    ) {
      throw new Error(
        latestWebhookError
          .message
      )
    }


    const {
      count:
        webhooks24h,

      error:
        webhooks24hError,
    } =
      await admin
        .from(
          'webhook_events'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true,
          }
        )
        .eq(
          'project_id',
          projectId
        )
        .gte(
          'received_at',
          since24h
        )


    if (
      webhooks24hError
    ) {
      throw new Error(
        webhooks24hError
          .message
      )
    }


    /*
     * =====================================================
     * ÚLTIMA VENDA
     * =====================================================
     */

    const {
      data:
        latestSale,

      error:
        latestSaleError,
    } =
      await admin
        .from(
          'orders'
        )
        .select(
          `
          id,
          provider,
          status,
          gross_amount,
          paid_at,
          created_at
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'status',
          'paid'
        )
        .order(
          'paid_at',
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle()


    if (
      latestSaleError
    ) {
      throw new Error(
        latestSaleError
          .message
      )
    }


    /*
     * =====================================================
     * STATUS DE TRACKING
     * =====================================================
     *
     * Não classificamos ausência de
     * tráfego como "quebrado".
     *
     * Antes da instalação real na PV,
     * "waiting" é esperado.
     * =====================================================
     */

    const lastPageViewMinutes =
      ageInMinutes(
        latestPageViewResult
          .data
          ?.occurred_at
      )


    let trackingStatus:
      | 'not_configured'
      | 'waiting'
      | 'active'
      | 'inactive'


    if (
      activeSources.length ===
      0
    ) {
      trackingStatus =
        'not_configured'
    } else if (
      lastPageViewMinutes ===
      null
    ) {
      trackingStatus =
        'waiting'
    } else if (
      lastPageViewMinutes <=
      1440
    ) {
      trackingStatus =
        'active'
    } else {
      trackingStatus =
        'inactive'
    }


    /*
     * =====================================================
     * STATUS DO WEBHOOK
     * =====================================================
     */

    const checkoutList =
      checkoutIntegrations ??
      []


    const lastWebhookMinutes =
      ageInMinutes(
        latestWebhook
          ?.received_at
      )


    let webhookStatus:
      | 'not_configured'
      | 'waiting'
      | 'operational'
      | 'error'


    if (
      checkoutList.length ===
      0
    ) {
      webhookStatus =
        'not_configured'
    } else if (
      latestWebhook
        ?.status ===
        'error'
    ) {
      webhookStatus =
        'error'
    } else if (
      latestWebhook
    ) {
      webhookStatus =
        'operational'
    } else {
      webhookStatus =
        'waiting'
    }


    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    const diagnostics = await diagnosticsResult
    if (diagnostics.error) throw diagnostics.error

    return NextResponse.json({
      diagnostics: diagnostics.value,
      ok: true,


      project: {
        id:
          project.id,

        name:
          project.name,
      },


      tracking: {
        status:
          trackingStatus,

        sources: {
          total:
            sources.length,

          active:
            activeSources
              .length,

          items:
            sources.map(
              (
                source
              ) => ({
                id:
                  source.id,

                name:
                  source.name,

                domain:
                  source.domain,

                isActive:
                  source
                    .is_active,
              })
            ),
        },


        lastEvent:
          latestEventResult
            .data ?? null,

        lastPageView:
          latestPageViewResult
            .data ?? null,

        lastPageViewMinutes,


        lastCheckout:
          latestCheckoutResult
            .data ?? null,

        lastCheckoutMinutes:
          ageInMinutes(
            latestCheckoutResult
              .data
              ?.occurred_at
          ),


        last24h: {
          sessions:
            sessionsResult
              .count ??
            0,

          events:
            eventsResult
              .count ??
            0,

          pageViews:
            pageViewsResult
              .count ??
            0,

          initiateCheckouts:
            checkoutEventsResult
              .count ??
            0,
        },
      },


      checkout: {
        status:
          webhookStatus,

        integrations:
          checkoutList.map(
            (
              integration
            ) => ({
              id:
                integration.id,

              provider:
                integration
                  .provider,

              status:
                integration
                  .status,
            })
          ),

        latestWebhook:
          latestWebhook ??
          null,

        lastWebhookMinutes,

        webhooks24h:
          webhooks24h ??
          0,
      },


      sales: {
        latest:
          latestSale ??
          null,

        lastSaleMinutes:
          ageInMinutes(
            latestSale
              ?.paid_at
          ),
      },


      generatedAt:
        now.toISOString(),
    })
  } catch (error) {
    console.error(
      'TRACKING HEALTH ERROR:',
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
