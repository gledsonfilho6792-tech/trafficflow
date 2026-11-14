import {
  createHash,
} from 'crypto'

import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createAdminClient,
} from '@/lib/supabase/admin'

import {
  isWebhookProvider,
  type WebhookPayload,
} from '@/lib/webhooks/types'

import {
  normalizeWebhookMetadata,
} from '@/lib/webhooks/normalize'

import {
  processWebhookEvent,
} from '@/lib/webhooks/process'

export const dynamic =
  'force-dynamic'

type RouteContext = {
  params: Promise<{
    provider: string
    integrationId: string
  }>
}

function createDedupeKey(
  provider: string,
  integrationId: string,
  rawBody: string
) {
  return createHash('sha256')
    .update(
      `${provider}:${integrationId}:${rawBody}`
    )
    .digest('hex')
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const {
      provider: rawProvider,
      integrationId,
    } = await context.params

    const provider =
      rawProvider.toLowerCase()

    /*
     * Impede providers desconhecidos.
     */
    if (
      !isWebhookProvider(provider)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Provider não suportado.',
        },
        {
          status: 404,
        }
      )
    }

    /*
     * Proteção básica contra payloads
     * absurdamente grandes.
     */
    const contentLength =
      Number(
        request.headers.get(
          'content-length'
        ) ?? 0
      )

    if (
      contentLength >
      1_000_000
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Payload muito grande.',
        },
        {
          status: 413,
        }
      )
    }

    const rawBody =
      await request.text()

    if (!rawBody) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Payload vazio.',
        },
        {
          status: 400,
        }
      )
    }

    let payload:
      WebhookPayload

    try {
      const parsed =
        JSON.parse(rawBody)

      if (
        !parsed ||
        typeof parsed !==
          'object' ||
        Array.isArray(parsed)
      ) {
        throw new Error(
          'JSON deve ser um objeto.'
        )
      }

      payload =
        parsed as WebhookPayload
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Payload JSON inválido.',
        },
        {
          status: 400,
        }
      )
    }

    const admin =
      createAdminClient()

    /*
     * A própria URL traz o integrationId,
     * mas ainda confirmamos no banco que
     * aquela integração realmente pertence
     * ao provider informado.
     */
    const {
      data: integration,
      error:
        integrationError,
    } = await admin
      .from('integrations')
      .select(
  `
  id,
  project_id,
  provider,
  integration_type,
  status,
  config
  `
)
      .eq(
        'id',
        integrationId
      )
      .eq(
        'provider',
        provider
      )
      .maybeSingle()

    if (
      integrationError ||
      !integration
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Integração não encontrada.',
        },
        {
          status: 404,
        }
      )
    }
/*
 * Autenticação do webhook Applyfy.
 *
 * O token original nunca fica salvo.
 * Guardamos apenas seu SHA-256.
 */
if (provider === 'applyfy') {
  const config =
    integration.config &&
    typeof integration.config === 'object' &&
    !Array.isArray(integration.config)
      ? (
          integration.config as Record<
            string,
            unknown
          >
        )
      : {}

  const expectedTokenHash =
    typeof config.webhook_token_sha256 ===
      'string'
      ? config.webhook_token_sha256
      : null

  const receivedToken =
    typeof payload.token === 'string'
      ? payload.token
      : null

  if (
    !expectedTokenHash ||
    !receivedToken
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Webhook não autorizado.',
      },
      {
        status: 401,
      }
    )
  }

  const receivedTokenHash =
    createHash('sha256')
      .update(receivedToken)
      .digest('hex')

  if (
    receivedTokenHash !==
    expectedTokenHash
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Webhook não autorizado.',
      },
      {
        status: 401,
      }
    )
  }
}
    const normalized =
      normalizeWebhookMetadata(
        provider,
        payload
      )

    const logicalEventKey =
  normalized.eventType &&
  normalized.externalEventId
    ? [
        provider,
        integrationId,
        normalized.eventType,
        normalized.externalEventId,
      ].join(':')
    : rawBody

const dedupeKey =
  createDedupeKey(
    provider,
    integrationId,
    logicalEventKey
  )

    const {
      data: webhookEvent,
      error: webhookError,
    } = await admin
      .from('webhook_events')
      .insert({
        project_id:
          integration.project_id,

        integration_id:
          integration.id,

        provider,

        event_type:
          normalized.eventType,

        external_event_id:
          normalized.externalEventId,

        dedupe_key:
          dedupeKey,

        payload,

        status:
          'received',

        received_at:
          new Date()
            .toISOString(),
      })
      .select(
        `
        id,
        received_at
        `
      )
      .single()

    /*
     * PostgreSQL 23505 =
     * violação de UNIQUE.
     *
     * Nesse caso o webhook já entrou
     * anteriormente. Respondemos 200
     * para evitar reenvios infinitos.
     */
    if (
      webhookError?.code ===
      '23505'
    ) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
      })
    }

    if (webhookError) {
      console.error(
        'WEBHOOK SAVE ERROR:',
        webhookError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'Erro ao armazenar webhook.',
        },
        {
          status: 500,
        }
      )
    }
const processing =
  await processWebhookEvent({
    webhookEventId:
      webhookEvent.id,

    projectId:
      integration.project_id,

    integrationId:
      integration.id,

    provider,

    payload,
  })
    return NextResponse.json({
  ok: true,

  provider,

  received: true,

  processed:
    processing.processed,

  eventId:
    webhookEvent.id,

  orderId:
    processing.orderId,

  receivedAt:
    webhookEvent.received_at,
})
  } catch (error) {
    console.error(
      'WEBHOOK ERROR:',
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