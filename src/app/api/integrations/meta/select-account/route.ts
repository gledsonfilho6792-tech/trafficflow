import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RequestBody = {
  projectId: string
  integrationId: string
  account: {
    id: string
    account_id?: string
    name?: string
    account_status?: number
    currency?: string
    timezone_name?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()

    const {
      projectId,
      integrationId,
      account,
    } = body

    if (
      !projectId ||
      !integrationId ||
      !account?.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Dados incompletos.',
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
      return NextResponse.json(
        {
          ok: false,
          error: 'Usuário não autenticado.',
        },
        {
          status: 401,
        }
      )
    }

    // Confirma propriedade do projeto
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
          ok: false,
          error: 'Projeto não encontrado.',
        },
        {
          status: 404,
        }
      )
    }

    // Confirma integração Meta desse projeto
    const {
      data: integration,
      error: integrationError,
    } = await supabase
      .from('integrations')
      .select('id')
      .eq('id', integrationId)
      .eq('project_id', projectId)
      .eq('provider', 'meta')
      .eq('integration_type', 'ads')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Integração Meta não encontrada.',
        },
        {
          status: 404,
        }
      )
    }

    // Desativa qualquer conta anteriormente ativa
    const {
      error: deactivateError,
    } = await supabase
      .from('ad_accounts')
      .update({
        is_active: false,
      })
      .eq('integration_id', integrationId)

    if (deactivateError) {
      console.error(
        'META ACCOUNT DEACTIVATE ERROR:',
        deactivateError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'Erro ao atualizar contas anteriores.',
          details:
            deactivateError.message,
        },
        {
          status: 500,
        }
      )
    }

    // Cria ou atualiza a conta selecionada
    const {
      data: savedAccount,
      error: accountError,
    } = await supabase
      .from('ad_accounts')
      .upsert(
        {
          project_id: projectId,
          integration_id: integrationId,

          provider: 'meta',

          external_id: account.id,

          account_id:
            account.account_id ?? null,

          name:
            account.name ??
            'Conta Meta Ads',

          account_status:
            account.account_status ??
            null,

          currency:
            account.currency ?? null,

          timezone_name:
            account.timezone_name ??
            null,

          is_active: true,
        },
        {
          onConflict:
            'integration_id,external_id',
        }
      )
      .select()
      .single()

    if (accountError) {
      console.error(
        'META ACCOUNT SAVE ERROR:',
        accountError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'Erro ao salvar conta de anúncios.',
          details:
            accountError.message,
          code:
            accountError.code,
        },
        {
          status: 500,
        }
      )
    }

    // Atualiza integração
    const {
      error: updateIntegrationError,
    } = await supabase
      .from('integrations')
      .update({
        external_account_id:
          account.id,

        status: 'connected',
      })
      .eq('id', integrationId)

    if (updateIntegrationError) {
      console.error(
        'META INTEGRATION UPDATE ERROR:',
        updateIntegrationError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'Conta salva, mas integração não foi atualizada.',
          details:
            updateIntegrationError.message,
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      ok: true,
      account: savedAccount,
    })
  } catch (error) {
    console.error(
      'META SELECT ACCOUNT ERROR:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          'Erro inesperado ao selecionar a conta.',
      },
      {
        status: 500,
      }
    )
  }
}