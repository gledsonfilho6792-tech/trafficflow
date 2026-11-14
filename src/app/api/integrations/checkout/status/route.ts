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

import {
  isWebhookProvider,
} from '@/lib/webhooks/types'


export const dynamic =
  'force-dynamic'


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


function asRecord(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {}
  }

  return value as Record<
    string,
    unknown
  >
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
      error: userError,
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
     * PARÂMETROS
     * =====================================================
     */

    const projectId =
      request.nextUrl
        .searchParams
        .get('projectId')

    const rawProvider =
      request.nextUrl
        .searchParams
        .get('provider')


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


    if (!rawProvider) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Provider ausente.',
        },
        {
          status: 400,
        }
      )
    }


    const provider =
      rawProvider
        .toLowerCase()


    if (
      !isWebhookProvider(
        provider
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Provider não suportado.',
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
      error: projectError,
    } =
      await supabase
        .from('projects')
        .select('id')
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


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * INTEGRAÇÃO
     * =====================================================
     */

    const {
      data: integration,
      error:
        integrationError,
    } =
      await admin
        .from('integrations')
        .select(
          `
          id,
          status,
          config
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'provider',
          provider
        )
        .eq(
          'integration_type',
          'checkout'
        )
        .maybeSingle()


    if (
      integrationError
    ) {
      throw new Error(
        integrationError.message
      )
    }


    if (!integration) {
      return NextResponse.json({
        ok: true,

        configured:
          false,

        healthStatus:
          'not_configured',

        integration:
          null,

        webhook: {
          configured:
            false,

          operational:
            false,

          totalEvents:
            0,

          lastReceivedAt:
            null,

          lastEventType:
            null,

          lastStatus:
            null,
        },

        sales: {
          totalPaid:
            0,

          lastPaidAt:
            null,
        },

        tracking: {
          configured:
            false,

          operational:
            false,

          totalEvents:
            0,

          lastActivityAt:
            null,
        },
      })
    }


    /*
     * =====================================================
     * CONFIG
     * =====================================================
     */

    const config =
      asRecord(
        integration.config
      )


    /*
     * Compatibilidade:
     *
     * integrações antigas podem possuir
     * apenas webhook_token_sha256.
     *
     * integrações novas também possuem
     * webhook_token_configured.
     */
    const tokenConfigured =
      Boolean(
        config
          .webhook_token_configured ||
        config
          .webhook_token_sha256
      )


    /*
     * =====================================================
     * WEBHOOKS
     * =====================================================
     */

    const [
      latestWebhookResult,
      webhookCountResult,
    ] =
      await Promise.all([
        admin
          .from(
            'webhook_events'
          )
          .select(
            `
            event_type,
            status,
            received_at
            `
          )
          .eq(
            'integration_id',
            integration.id
          )
          .order(
            'received_at',
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle(),

        admin
          .from(
            'webhook_events'
          )
          .select(
            'id',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq(
            'integration_id',
            integration.id
          ),
      ])


    if (
      latestWebhookResult.error
    ) {
      throw new Error(
        latestWebhookResult
          .error
          .message
      )
    }


    if (
      webhookCountResult.error
    ) {
      throw new Error(
        webhookCountResult
          .error
          .message
      )
    }


    const lastWebhook =
      latestWebhookResult
        .data


    const webhookOperational =
      Boolean(
        lastWebhook
          ?.received_at &&
        lastWebhook
          ?.status ===
          'processed'
      )


    /*
     * =====================================================
     * VENDAS
     * =====================================================
     */

    const [
      latestSaleResult,
      paidCountResult,
    ] =
      await Promise.all([
        admin
          .from('orders')
          .select(
            'paid_at'
          )
          .eq(
            'integration_id',
            integration.id
          )
          .eq(
            'status',
            'paid'
          )
          .not(
            'paid_at',
            'is',
            null
          )
          .order(
            'paid_at',
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle(),

        admin
          .from('orders')
          .select(
            'id',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq(
            'integration_id',
            integration.id
          )
          .eq(
            'status',
            'paid'
          ),
      ])


    if (
      latestSaleResult.error
    ) {
      throw new Error(
        latestSaleResult
          .error
          .message
      )
    }


    if (
      paidCountResult.error
    ) {
      throw new Error(
        paidCountResult
          .error
          .message
      )
    }


    /*
     * =====================================================
     * TRACKING
     * =====================================================
     */

    const {
      data: trackingSource,
      error:
        trackingSourceError,
    } =
      await admin
        .from(
          'tracking_sources'
        )
        .select(
          `
          id,
          public_key,
          domain,
          is_active
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'is_active',
          true
        )
        .order(
          'created_at',
          {
            ascending:
              true,
          }
        )
        .limit(1)
        .maybeSingle()


    if (
      trackingSourceError
    ) {
      throw new Error(
        trackingSourceError
          .message
      )
    }


    let trackingCount =
      0

    let lastTrackingActivity:
      string | null =
      null


    if (trackingSource) {
      const [
        latestTrackingResult,
        trackingCountResult,
      ] =
        await Promise.all([
          admin
            .from(
              'tracking_events'
            )
            .select(
              'occurred_at'
            )
            .eq(
              'tracking_source_id',
              trackingSource.id
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
              'id',
              {
                count:
                  'exact',
                head:
                  true,
              }
            )
            .eq(
              'tracking_source_id',
              trackingSource.id
            ),
        ])


      if (
        latestTrackingResult
          .error
      ) {
        throw new Error(
          latestTrackingResult
            .error
            .message
        )
      }


      if (
        trackingCountResult
          .error
      ) {
        throw new Error(
          trackingCountResult
            .error
            .message
        )
      }


      trackingCount =
        trackingCountResult
          .count ?? 0


      lastTrackingActivity =
        latestTrackingResult
          .data
          ?.occurred_at ??
        null
    }


    const trackingOperational =
      Boolean(
        trackingSource &&
        lastTrackingActivity
      )


    /*
     * =====================================================
     * SAÚDE REAL
     * =====================================================
     *
     * Não confiamos apenas em:
     *
     * integrations.status
     *
     * porque integrações antigas podem
     * estar marcadas como disconnected
     * mesmo recebendo dados normalmente.
     *
     * A atividade real tem prioridade.
     */

    let healthStatus:
      | 'operational'
      | 'configured'
      | 'needs_configuration' =
      'needs_configuration'


    if (
      webhookOperational
    ) {
      healthStatus =
        'operational'
    } else if (
      tokenConfigured
    ) {
      healthStatus =
        'configured'
    }


    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    return NextResponse.json({
      ok: true,

      configured:
        true,

      healthStatus,

      integration: {
        id:
          integration.id,

        /*
         * Mantemos o status do banco
         * apenas para diagnóstico.
         */
        storedStatus:
          integration.status,

        webhookTokenConfigured:
          tokenConfigured,
      },

      webhook: {
        configured:
          tokenConfigured,

        operational:
          webhookOperational,

        totalEvents:
          webhookCountResult
            .count ?? 0,

        lastReceivedAt:
          lastWebhook
            ?.received_at ??
          null,

        lastEventType:
          lastWebhook
            ?.event_type ??
          null,

        lastStatus:
          lastWebhook
            ?.status ??
          null,
      },

      sales: {
        totalPaid:
          paidCountResult
            .count ?? 0,

        lastPaidAt:
          latestSaleResult
            .data
            ?.paid_at ??
          null,
      },

      tracking: {
        configured:
          Boolean(
            trackingSource
          ),

        operational:
          trackingOperational,

        sourceId:
          trackingSource
            ?.id ??
          null,

        domain:
          trackingSource
            ?.domain ??
          null,

        totalEvents:
          trackingCount,

        lastActivityAt:
          lastTrackingActivity,
      },
    })
  } catch (error) {
    console.error(
      'CHECKOUT STATUS ERROR:',
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