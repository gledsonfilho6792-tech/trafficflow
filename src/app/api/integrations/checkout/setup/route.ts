import {
  createHash,
} from 'crypto'

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


type SetupPayload = {
  projectId?: unknown
  provider?: unknown
  webhookToken?: unknown
}


function getString(
  value: unknown
): string | null {
  return typeof value === 'string' &&
    value.trim().length > 0
    ? value.trim()
    : null
}


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


/*
 * =========================================================
 * URL PÚBLICA DO TRAFFIC FLOW
 * =========================================================
 *
 * Mesmo durante desenvolvimento local,
 * webhooks e scripts precisam apontar
 * para a aplicação publicada.
 *
 * Exemplo:
 *
 * https://traffic-flow-blond.vercel.app
 *
 * Se a variável ainda não existir,
 * usamos a origem atual apenas como
 * fallback.
 */
function getPublicOrigin(
  request: NextRequest
) {
  const configuredOrigin =
    process.env
      .TRAFFIC_FLOW_PUBLIC_URL
      ?.trim()
      .replace(
        /\/+$/,
        ''
      )

  if (configuredOrigin) {
    return configuredOrigin
  }

  return request
    .nextUrl
    .origin
}


export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * USUÁRIO AUTENTICADO
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
     * PAYLOAD
     * =====================================================
     */

    let body:
      SetupPayload

    try {
      body =
        await request.json()
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            'JSON inválido.',
        },
        {
          status: 400,
        }
      )
    }


    const projectId =
      getString(
        body.projectId
      )

    const rawProvider =
      getString(
        body.provider
      )

    const webhookToken =
      getString(
        body.webhookToken
      )


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
     * CONFIRMA PROPRIEDADE DO PROJETO
     * =====================================================
     */

    const {
      data: project,
      error: projectError,
    } =
      await supabase
        .from('projects')
        .select(
          `
          id,
          name,
          slug,
          owner_id
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
     * A partir daqui podemos usar
     * service role porque usuário
     * e propriedade do projeto
     * já foram verificados.
     */
    const admin =
      createAdminClient()


    /*
     * =====================================================
     * INTEGRAÇÃO
     * =====================================================
     */

    const {
      data:
        existingIntegration,

      error:
        existingIntegrationError,
    } =
      await admin
        .from(
          'integrations'
        )
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
      existingIntegrationError
    ) {
      throw new Error(
        existingIntegrationError
          .message
      )
    }


    let integration =
      existingIntegration


    /*
     * Preserva qualquer configuração
     * já existente.
     */
    const integrationConfig =
      asRecord(
        existingIntegration
          ?.config
      )


    /*
     * =====================================================
     * TOKEN DO WEBHOOK
     * =====================================================
     *
     * Nunca armazenamos o token
     * original.
     *
     * Apenas seu SHA-256.
     */

    if (webhookToken) {
      integrationConfig
        .webhook_token_sha256 =
        createHash(
          'sha256'
        )
          .update(
            webhookToken
          )
          .digest(
            'hex'
          )


      integrationConfig
        .webhook_token_configured =
        true
    }


    /*
     * =====================================================
     * CRIAR INTEGRAÇÃO
     * =====================================================
     */

    if (!integration) {
      const {
        data:
          newIntegration,

        error:
          integrationInsertError,
      } =
        await admin
          .from(
            'integrations'
          )
          .insert({
            project_id:
              projectId,

            provider,

            integration_type:
              'checkout',

            status:
              'disconnected',

            config:
              integrationConfig,
          })
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
          .single()


      if (
        integrationInsertError ||
        !newIntegration
      ) {
        throw new Error(
          integrationInsertError
            ?.message ??
          'Erro ao criar integração.'
        )
      }


      integration =
        newIntegration
    }


    /*
     * =====================================================
     * ATUALIZAR TOKEN
     * =====================================================
     */

    else if (
      webhookToken
    ) {
      const {
        data:
          updatedIntegration,

        error:
          integrationUpdateError,
      } =
        await admin
          .from(
            'integrations'
          )
          .update({
            config:
              integrationConfig,
          })
          .eq(
            'id',
            integration.id
          )
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
          .single()


      if (
        integrationUpdateError ||
        !updatedIntegration
      ) {
        throw new Error(
          integrationUpdateError
            ?.message ??
          'Erro ao atualizar integração.'
        )
      }


      integration =
        updatedIntegration
    }


    /*
     * =====================================================
     * TRACKING SOURCE
     * =====================================================
     *
     * Uma mesma fonte principal
     * é compartilhada entre os
     * checkouts do projeto.
     *
     * Assim:
     *
     * Applyfy
     * Hotmart
     * Kiwify
     * PerfectPay
     * etc.
     *
     * não criam uma fonte separada
     * desnecessariamente.
     * =====================================================
     */

    const {
      data:
        existingSource,

      error:
        existingSourceError,
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
      existingSourceError
    ) {
      throw new Error(
        existingSourceError
          .message
      )
    }


    let trackingSource =
      existingSource


    /*
     * =====================================================
     * CRIAR TRACKING SOURCE
     * =====================================================
     */

    if (!trackingSource) {
      const {
        data:
          newSource,

        error:
          sourceInsertError,
      } =
        await admin
          .from(
            'tracking_sources'
          )
          .insert({
            project_id:
              projectId,

            name:
              `${project.name} - Principal`,

            domain:
              null,

            is_active:
              true,
          })
          .select(
            `
            id,
            name,
            domain,
            public_key,
            is_active
            `
          )
          .single()


      if (
        sourceInsertError ||
        !newSource
      ) {
        throw new Error(
          sourceInsertError
            ?.message ??
          'Erro ao criar fonte de tracking.'
        )
      }


      trackingSource =
        newSource
    }


    /*
     * =====================================================
     * URL PÚBLICA
     * =====================================================
     *
     * NÃO usamos mais:
     *
     * request.nextUrl.origin
     *
     * diretamente.
     *
     * No localhost isso geraria:
     *
     * http://localhost:3000/...
     *
     * Agora usamos a URL pública
     * oficial do Traffic Flow.
     */

    const origin =
      getPublicOrigin(
        request
      )


    /*
     * =====================================================
     * WEBHOOK
     * =====================================================
     */

    const webhookUrl =
      `${origin}/api/webhooks/${provider}/${integration.id}`


    /*
     * =====================================================
     * SCRIPT DE TRACKING
     * =====================================================
     */

    const trackingScript =
      `<script src="${origin}/traffic-flow.js" data-source-key="${trackingSource.public_key}"></script>`


    /*
     * =====================================================
     * TOKEN CONFIGURADO
     * =====================================================
     *
     * Compatibilidade com integrações
     * criadas antes da flag
     * webhook_token_configured existir.
     */

    const finalConfig =
      asRecord(
        integration.config
      )


    const webhookTokenConfigured =
      Boolean(
        finalConfig
          .webhook_token_configured ||
        finalConfig
          .webhook_token_sha256
      )


    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    return NextResponse.json({
      ok: true,

      project: {
        id:
          project.id,

        name:
          project.name,

        slug:
          project.slug,
      },

      integration: {
        id:
          integration.id,

        provider:
          integration.provider,

        status:
          integration.status,

        webhookTokenConfigured,
      },

      webhook: {
        url:
          webhookUrl,
      },

      tracking: {
        sourceId:
          trackingSource.id,

        sourceName:
          trackingSource.name,

        publicKey:
          trackingSource.public_key,

        domain:
          trackingSource.domain,

        script:
          trackingScript,
      },
    })
  } catch (error) {
    console.error(
      'CHECKOUT SETUP ERROR:',
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