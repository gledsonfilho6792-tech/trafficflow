import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type OAuthState = {
  projectId: string
  nonce: string
}

type MetaTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

type MetaProfile = {
  id?: string
  name?: string
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

type MetaAdAccount = {
  id: string
  account_id?: string
  name?: string
  account_status?: number
  currency?: string
  timezone_name?: string
}

type MetaAdAccountsResponse = {
  data?: MetaAdAccount[]
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const code =
      request.nextUrl.searchParams.get('code')

    const state =
      request.nextUrl.searchParams.get('state')

    const oauthError =
      request.nextUrl.searchParams.get('error')

    const oauthErrorDescription =
      request.nextUrl.searchParams.get(
        'error_description'
      )

    if (!state) {
      return NextResponse.json(
        {
          error: 'State do OAuth não recebido.',
        },
        {
          status: 400,
        }
      )
    }

    let parsedState: OAuthState

    try {
      parsedState = JSON.parse(
        Buffer.from(
          state,
          'base64url'
        ).toString('utf8')
      )
    } catch {
      return NextResponse.json(
        {
          error: 'State do OAuth inválido.',
        },
        {
          status: 400,
        }
      )
    }

    const { projectId, nonce } = parsedState

    if (!projectId || !nonce) {
      return NextResponse.json(
        {
          error: 'State do OAuth incompleto.',
        },
        {
          status: 400,
        }
      )
    }

    const cookieNonce =
      request.cookies.get(
        'meta_oauth_nonce'
      )?.value

    if (!cookieNonce || cookieNonce !== nonce) {
      return NextResponse.json(
        {
          error:
            'Falha na validação de segurança do OAuth.',
        },
        {
          status: 400,
        }
      )
    }

    if (oauthError) {
      const redirectUrl = new URL(
        `/project/${projectId}/integrations`,
        request.url
      )

      redirectUrl.searchParams.set(
        'meta',
        'cancelled'
      )

      if (oauthErrorDescription) {
        redirectUrl.searchParams.set(
          'reason',
          oauthErrorDescription
        )
      }

      return NextResponse.redirect(
        redirectUrl
      )
    }

    if (!code) {
      return NextResponse.json(
        {
          error:
            'Código de autorização da Meta não recebido.',
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

    /*
     * Confirma novamente que o projeto
     * realmente pertence ao usuário.
     */
    const {
      data: project,
      error: projectError,
    } = await supabase
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

    /*
     * Encontra a integração Meta Ads
     * previamente criada.
     */
    const {
      data: integration,
      error: integrationError,
    } = await supabase
      .from('integrations')
      .select(
        'id, config'
      )
      .eq('project_id', projectId)
      .eq('provider', 'meta')
      .eq('integration_type', 'ads')
      .single()

    if (
      integrationError ||
      !integration
    ) {
      return NextResponse.json(
        {
          error:
            'Integração Meta Ads não encontrada.',
        },
        {
          status: 404,
        }
      )
    }

    const appId =
      process.env.META_APP_ID

    const appSecret =
      process.env.META_APP_SECRET

    const redirectUri =
      process.env.META_REDIRECT_URI

    const apiVersion =
      process.env.META_API_VERSION ||
      'v26.0'

    if (
      !appId ||
      !appSecret ||
      !redirectUri
    ) {
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

    /*
     * TROCA:
     *
     * authorization code
     * ↓
     * access token
     */
    const tokenUrl = new URL(
      `https://graph.facebook.com/${apiVersion}/oauth/access_token`
    )

    tokenUrl.searchParams.set(
      'client_id',
      appId
    )

    tokenUrl.searchParams.set(
      'client_secret',
      appSecret
    )

    tokenUrl.searchParams.set(
      'redirect_uri',
      redirectUri
    )

    tokenUrl.searchParams.set(
      'code',
      code
    )

    const tokenResponse =
      await fetch(tokenUrl, {
        cache: 'no-store',
      })

    const tokenData: MetaTokenResponse =
      await tokenResponse.json()

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        'META TOKEN EXCHANGE ERROR:',
        tokenData.error
      )

      return NextResponse.json(
        {
          error:
            'A Meta não retornou um Access Token válido.',
          meta:
            tokenData.error?.message,
        },
        {
          status: 400,
        }
      )
    }

    let finalAccessToken =
      tokenData.access_token

    let expiresIn =
      tokenData.expires_in ?? null

    /*
     * Tenta trocar pelo token
     * de duração estendida.
     */
    const longLivedUrl =
      new URL(
        `https://graph.facebook.com/${apiVersion}/oauth/access_token`
      )

    longLivedUrl.searchParams.set(
      'grant_type',
      'fb_exchange_token'
    )

    longLivedUrl.searchParams.set(
      'client_id',
      appId
    )

    longLivedUrl.searchParams.set(
      'client_secret',
      appSecret
    )

    longLivedUrl.searchParams.set(
      'fb_exchange_token',
      finalAccessToken
    )

    const longLivedResponse =
      await fetch(longLivedUrl, {
        cache: 'no-store',
      })

    const longLivedData:
      MetaTokenResponse =
      await longLivedResponse.json()

    if (
      longLivedResponse.ok &&
      longLivedData.access_token
    ) {
      finalAccessToken =
        longLivedData.access_token

      expiresIn =
        longLivedData.expires_in ??
        expiresIn
    }

    /*
     * Busca o usuário autorizado.
     */
    const profileResponse =
      await fetch(
        `https://graph.facebook.com/${apiVersion}/me?fields=id,name`,
        {
          headers: {
            Authorization:
              `Bearer ${finalAccessToken}`,
          },
          cache: 'no-store',
        }
      )

    const profileData: MetaProfile =
      await profileResponse.json()

    if (!profileResponse.ok) {
      console.error(
        'META PROFILE ERROR:',
        profileData.error
      )

      return NextResponse.json(
        {
          error:
            'Não foi possível consultar o perfil autorizado na Meta.',
          meta:
            profileData.error?.message,
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Busca as contas de anúncios
     * acessíveis pelo usuário.
     */
    const adAccountsUrl = new URL(
      `https://graph.facebook.com/${apiVersion}/me/adaccounts`
    )

    adAccountsUrl.searchParams.set(
      'fields',
      [
        'id',
        'account_id',
        'name',
        'account_status',
        'currency',
        'timezone_name',
      ].join(',')
    )

    adAccountsUrl.searchParams.set(
      'limit',
      '100'
    )

    const adAccountsResponse =
      await fetch(
        adAccountsUrl,
        {
          headers: {
            Authorization:
              `Bearer ${finalAccessToken}`,
          },
          cache: 'no-store',
        }
      )

    const adAccountsData:
      MetaAdAccountsResponse =
      await adAccountsResponse.json()

    if (!adAccountsResponse.ok) {
      console.error(
        'META AD ACCOUNTS ERROR:',
        adAccountsData.error
      )

      return NextResponse.json(
        {
          error:
            'Não foi possível buscar as contas de anúncios.',
          meta:
            adAccountsData.error?.message,
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Salva o Access Token
     * criptografado no Supabase Vault.
     */
    const {
      error: secretError,
    } = await supabase.rpc(
      'store_integration_secret',
      {
        p_integration_id:
          integration.id,

        p_secret:
          finalAccessToken,
      }
    )

    if (secretError) {
      console.error(
        'META SECRET STORE ERROR:',
        secretError
      )

      return NextResponse.json(
        {
          error:
            'Não foi possível armazenar a credencial da Meta com segurança.',
        },
        {
          status: 500,
        }
      )
    }

    /*
     * Apenas informações NÃO sensíveis
     * entram no config.
     */
    const previousConfig =
      integration.config &&
      typeof integration.config ===
        'object'
        ? integration.config
        : {}

    const {
      error: updateError,
    } = await supabase
      .from('integrations')
      .update({
        config: {
          ...previousConfig,

          oauth_authorized: true,

          meta_user_id:
            profileData.id ?? null,

          meta_user_name:
            profileData.name ?? null,

          token_received_at:
            new Date().toISOString(),

          token_expires_in:
            expiresIn,

          available_ad_accounts:
            adAccountsData.data ?? [],
        },
      })
      .eq(
        'id',
        integration.id
      )

    if (updateError) {
      console.error(
        'META INTEGRATION UPDATE ERROR:',
        updateError
      )

      return NextResponse.json(
        {
          error:
            'A conexão foi autorizada, mas não foi possível atualizar a integração.',
        },
        {
          status: 500,
        }
      )
    }

    /*
     * Volta para o Traffic Flow.
     */
    const redirectUrl =
      new URL(
        `/project/${projectId}/integrations`,
        request.url
      )

    redirectUrl.searchParams.set(
      'meta',
      'authorized'
    )

    const response =
      NextResponse.redirect(
        redirectUrl
      )

    response.cookies.set(
      'meta_oauth_nonce',
      '',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      }
    )

    return response
  } catch (error) {
    console.error(
      'META OAUTH CALLBACK ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Erro inesperado ao processar o retorno da Meta.',
      },
      {
        status: 500,
      }
    )
  }
}