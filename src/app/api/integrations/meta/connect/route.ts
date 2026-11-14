import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        {
          error: 'projectId não informado.',
        },
        {
          status: 400,
        }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/login', request.url)
      )
    }

    // Confirma que o projeto realmente pertence ao usuário logado.
    const { data: project, error: projectError } =
      await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('owner_id', user.id)
        .single()

    if (projectError || !project) {
      return NextResponse.json(
        {
          error: 'Projeto não encontrado.',
        },
        {
          status: 404,
        }
      )
    }

    const appId = process.env.META_APP_ID
    const redirectUri = process.env.META_REDIRECT_URI
    const configId = process.env.META_LOGIN_CONFIG_ID
    const apiVersion =
      process.env.META_API_VERSION || 'v26.0'

    if (!appId || !redirectUri || !configId) {
      return NextResponse.json(
        {
          error:
            'Configuração da Meta incompleta no servidor.',
        },
        {
          status: 500,
        }
      )
    }

    // Valor aleatório usado para impedir ataques de CSRF
    // e também associar o retorno ao projeto correto.
    const nonce = crypto.randomUUID()

    const state = Buffer.from(
      JSON.stringify({
        projectId,
        nonce,
      })
    ).toString('base64url')

    const oauthUrl = new URL(
      `https://www.facebook.com/${apiVersion}/dialog/oauth`
    )

    oauthUrl.searchParams.set('client_id', appId)
    oauthUrl.searchParams.set(
      'redirect_uri',
      redirectUri
    )

    oauthUrl.searchParams.set(
  'config_id',
  configId
)

oauthUrl.searchParams.set(
  'response_type',
  'code'
)

oauthUrl.searchParams.set(
  'override_default_response_type',
  'true'
)

    oauthUrl.searchParams.set(
      'state',
      state
    )

    const response = NextResponse.redirect(
      oauthUrl.toString()
    )

    response.cookies.set(
      'meta_oauth_nonce',
      nonce,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10,
      }
    )

    return response
  } catch (error) {
    console.error('META OAUTH CONNECT ERROR:', error)

    return NextResponse.json(
      {
        error:
          'Não foi possível iniciar a conexão com a Meta.',
      },
      {
        status: 500,
      }
    )
  }
}