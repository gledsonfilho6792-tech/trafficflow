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


function getString(
  value: string | null
) {
  if (!value) {
    return null
  }

  const trimmed =
    value.trim()

  return trimmed
    ? trimmed
    : null
}


export async function GET(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * TOKEN
     * =====================================================
     */

    const token =
      getString(
        request.nextUrl
          .searchParams
          .get('token')
      )


    if (
      !token ||
      !token.startsWith(
        'tf_'
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Attribution token inválido.',
        },
        {
          status: 400,
        }
      )
    }


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


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * TOKEN NO BANCO
     * =====================================================
     */

    const {
      data:
        attributionToken,

      error:
        tokenError,
    } =
      await admin
        .from(
          'attribution_tokens'
        )
        .select(
          `
          id,
          project_id,
          tracking_source_id,
          session_id,
          visitor_id,
          token,
          created_at,
          expires_at,
          last_used_at
          `
        )
        .eq(
          'token',
          token
        )
        .maybeSingle()


    if (
      tokenError
    ) {
      throw new Error(
        tokenError.message
      )
    }


    if (
      !attributionToken
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Token não encontrado.',
        },
        {
          status: 404,
        }
      )
    }


    /*
     * =====================================================
     * AUTORIZAÇÃO DO PROJETO
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
          attributionToken
            .project_id
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
     * =====================================================
     * PEDIDO QUE RECEBEU O TOKEN
     * =====================================================
     */

    const {
      data: order,

      error:
        orderError,
    } =
      await admin
        .from(
          'order_attribution'
        )
        .select(
          `
          order_id,
          provider,

          external_order_id,
          external_transaction_id,

          order_status,

          gross_amount,
          currency,

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

          order_created_at,
          paid_at
          `
        )
        .eq(
          'project_id',
          project.id
        )
        .eq(
          'attribution_token',
          token
        )
        .order(
          'order_created_at',
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle()


    if (
      orderError
    ) {
      throw new Error(
        orderError.message
      )
    }


    /*
     * =====================================================
     * CHECKS
     * =====================================================
     */

    const checks = {
      tokenExists:
        true,

      orderReceived:
        Boolean(order),

      sessionAttributed:
        Boolean(
          order
            ?.tracking_session_id
        ),

      campaignResolved:
        Boolean(
          order
            ?.campaign_id
        ),

      adSetResolved:
        Boolean(
          order
            ?.ad_set_id
        ),

      adResolved:
        Boolean(
          order
            ?.ad_id
        ),

      paid:
        order
          ?.order_status ===
        'paid',
    }


    /*
     * Para a 18.9B não exigimos
     * pagamento.
     *
     * O objetivo é provar que um pedido
     * REAL vindo da Applyfy percorreu:
     *
     * checkout → webhook → order
     * → sessão → Meta.
     */

    const attributionPassed =
      checks.orderReceived &&
      checks.sessionAttributed &&
      checks.campaignResolved &&
      checks.adSetResolved &&
      checks.adResolved


    return NextResponse.json({
      ok: true,

      project: {
        id:
          project.id,

        name:
          project.name,
      },

      token: {
        value:
          attributionToken
            .token,

        sessionId:
          attributionToken
            .session_id,

        visitorId:
          attributionToken
            .visitor_id,

        createdAt:
          attributionToken
            .created_at,

        lastUsedAt:
          attributionToken
            .last_used_at,
      },

      checks,

      attributionPassed,

      order:
        order ?? null,

      generatedAt:
        new Date()
          .toISOString(),
    })
  } catch (error) {
    console.error(
      'TRACKING E2E VERIFY ERROR:',
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