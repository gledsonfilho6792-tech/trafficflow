import {
  randomBytes,
} from 'crypto'

import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createAdminClient,
} from '@/lib/supabase/admin'


export const dynamic =
  'force-dynamic'


type TokenPayload = {
  sourceKey?: unknown
  sessionId?: unknown
  visitorId?: unknown
}


const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',

  'Access-Control-Allow-Headers':
    'Content-Type',
}


function getString(
  value: unknown
): string | null {
  return typeof value ===
      'string' &&
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


function createToken() {
  return (
    'tf_' +
    randomBytes(9)
      .toString(
        'base64url'
      )
  )
}


export async function OPTIONS() {
  return new NextResponse(
    null,
    {
      status: 204,
      headers:
        corsHeaders,
    }
  )
}


export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =====================================================
     * PAYLOAD
     * =====================================================
     */

    let body:
      TokenPayload

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
          headers:
            corsHeaders,
        }
      )
    }


    const sourceKey =
      getString(
        body.sourceKey
      )

    const sessionId =
      getString(
        body.sessionId
      )

    const visitorId =
      getString(
        body.visitorId
      )


    if (
      !sourceKey ||
      !isUuid(sourceKey)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'sourceKey inválida.',
        },
        {
          status: 400,
          headers:
            corsHeaders,
        }
      )
    }


    if (
      !sessionId ||
      !isUuid(sessionId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'sessionId inválida.',
        },
        {
          status: 400,
          headers:
            corsHeaders,
        }
      )
    }


    if (
      !visitorId ||
      !isUuid(visitorId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'visitorId inválido.',
        },
        {
          status: 400,
          headers:
            corsHeaders,
        }
      )
    }


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * TRACKING SOURCE
     * =====================================================
     *
     * sourceKey é pública, mas ela
     * determina de qual projeto
     * o token pode fazer parte.
     * =====================================================
     */

    const {
      data: source,
      error: sourceError,
    } =
      await admin
        .from(
          'tracking_sources'
        )
        .select(
          `
          id,
          project_id,
          is_active
          `
        )
        .eq(
          'public_key',
          sourceKey
        )
        .eq(
          'is_active',
          true
        )
        .maybeSingle()


    if (
      sourceError
    ) {
      throw new Error(
        sourceError.message
      )
    }


    if (!source) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Fonte de tracking não encontrada.',
        },
        {
          status: 404,
          headers:
            corsHeaders,
        }
      )
    }


    /*
     * =====================================================
     * TOKEN EXISTENTE
     * =====================================================
     *
     * Uma sessão não precisa ganhar
     * um novo token a cada página.
     *
     * Reutilizamos o mesmo token.
     * =====================================================
     */

    const {
      data:
        existingToken,

      error:
        existingTokenError,
    } =
      await admin
        .from(
          'attribution_tokens'
        )
        .select(
          `
          id,
          token,
          visitor_id,
          expires_at
          `
        )
        .eq(
          'tracking_source_id',
          source.id
        )
        .eq(
          'session_id',
          sessionId
        )
        .maybeSingle()


    if (
      existingTokenError
    ) {
      throw new Error(
        existingTokenError
          .message
      )
    }


    if (
      existingToken &&
      new Date(
        existingToken
          .expires_at
      ).getTime() >
        Date.now()
    ) {
      /*
       * Caso o visitor tenha mudado
       * por alguma razão, mantemos
       * o registro atualizado.
       */

      if (
        existingToken
          .visitor_id !==
        visitorId
      ) {
        await admin
          .from(
            'attribution_tokens'
          )
          .update({
            visitor_id:
              visitorId,
          })
          .eq(
            'id',
            existingToken.id
          )
      }


      return NextResponse.json(
        {
          ok: true,

          token:
            existingToken
              .token,

          reused:
            true,

          sessionId,
          visitorId,

          expiresAt:
            existingToken
              .expires_at,
        },
        {
          headers:
            corsHeaders,
        }
      )
    }


    /*
     * =====================================================
     * TOKEN NOVO
     * =====================================================
     */

    const expiresAt =
      new Date(
        Date.now() +
          30 *
            24 *
            60 *
            60 *
            1000
      ).toISOString()


    /*
     * Se havia um token expirado
     * para essa sessão, renovamos.
     */

    if (existingToken) {
      const newToken =
        createToken()


      const {
        data:
          renewedToken,

        error:
          renewError,
      } =
        await admin
          .from(
            'attribution_tokens'
          )
          .update({
            token:
              newToken,

            visitor_id:
              visitorId,

            expires_at:
              expiresAt,
          })
          .eq(
            'id',
            existingToken.id
          )
          .select(
            `
            token,
            expires_at
            `
          )
          .single()


      if (
        renewError ||
        !renewedToken
      ) {
        throw new Error(
          renewError
            ?.message ??
          'Não foi possível renovar o token.'
        )
      }


      return NextResponse.json(
        {
          ok: true,

          token:
            renewedToken
              .token,

          reused:
            false,

          sessionId,
          visitorId,

          expiresAt:
            renewedToken
              .expires_at,
        },
        {
          headers:
            corsHeaders,
        }
      )
    }


    /*
     * Uma colisão de token é
     * extremamente improvável,
     * mas tentamos até 3 vezes.
     */

    for (
      let attempt = 0;
      attempt < 3;
      attempt += 1
    ) {
      const token =
        createToken()


      const {
        data:
          insertedToken,

        error:
          insertError,
      } =
        await admin
          .from(
            'attribution_tokens'
          )
          .insert({
            project_id:
              source.project_id,

            tracking_source_id:
              source.id,

            session_id:
              sessionId,

            visitor_id:
              visitorId,

            token,

            expires_at:
              expiresAt,
          })
          .select(
            `
            token,
            expires_at
            `
          )
          .single()


      if (
        !insertError &&
        insertedToken
      ) {
        return NextResponse.json(
          {
            ok: true,

            token:
              insertedToken
                .token,

            reused:
              false,

            sessionId,
            visitorId,

            expiresAt:
              insertedToken
                .expires_at,
          },
          {
            headers:
              corsHeaders,
          }
        )
      }


      /*
       * 23505 =
       * unique violation.
       *
       * Se for uma colisão rara,
       * tentamos outro token.
       */

      if (
        insertError
          ?.code !==
        '23505'
      ) {
        throw new Error(
          insertError
            ?.message ??
          'Erro ao criar token.'
        )
      }
    }


    throw new Error(
      'Não foi possível gerar um token único.'
    )
  } catch (error) {
    console.error(
      'ATTRIBUTION TOKEN ERROR:',
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
        headers:
          corsHeaders,
      }
    )
  }
}