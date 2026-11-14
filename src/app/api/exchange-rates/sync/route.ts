import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type BcbQuotation = {
  cotacaoVenda?: number
  dataHoraCotacao?: string
  tipoBoletim?: string
}

type BcbResponse = {
  value?: BcbQuotation[]
}

function validateDate(
  value: string
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  )
}

function isoToBcbDate(
  isoDate: string
) {
  const [year, month, day] =
    isoDate.split('-')

  return `${month}-${day}-${year}`
}

function subtractDays(
  isoDate: string,
  days: number
) {
  const date =
    new Date(
      `${isoDate}T12:00:00Z`
    )

  date.setUTCDate(
    date.getUTCDate() - days
  )

  return date
    .toISOString()
    .slice(0, 10)
}

function extractIsoDate(
  value?: string
) {
  if (!value) {
    return null
  }

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    )

  if (!match) {
    return null
  }

  return `${match[1]}-${match[2]}-${match[3]}`
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json()

    const projectId =
      body?.projectId as
        | string
        | undefined

    const startDate =
      body?.startDate as
        | string
        | undefined

    const endDate =
      body?.endDate as
        | string
        | undefined

    if (
      !projectId ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'projectId, startDate e endDate são obrigatórios.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      !validateDate(startDate) ||
      !validateDate(endDate)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Datas inválidas. Use YYYY-MM-DD.',
        },
        {
          status: 400,
        }
      )
    }

    if (startDate > endDate) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'A data inicial não pode ser maior que a data final.',
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
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser()

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Usuário não autenticado.',
        },
        {
          status: 401,
        }
      )
    }

    /*
     * Confirma propriedade do projeto.
     */
    const {
      data: project,
      error: projectError,
    } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq(
        'owner_id',
        user.id
      )
      .single()

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
     * INTEGRAÇÃO META
     * =====================================================
     */

    const {
      data: integration,
      error: integrationError,
    } = await admin
      .from('integrations')
      .select('id')
      .eq(
        'project_id',
        projectId
      )
      .eq(
        'provider',
        'meta'
      )
      .eq(
        'integration_type',
        'ads'
      )
      .single()

    if (
      integrationError ||
      !integration
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Integração Meta não encontrada.',
        },
        {
          status: 404,
        }
      )
    }

    /*
     * =====================================================
     * CONTA DE ANÚNCIOS ATIVA
     * =====================================================
     */

    const {
      data: adAccount,
      error: adAccountError,
    } = await admin
      .from('ad_accounts')
      .select(
        `
        id,
        currency
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .eq(
        'integration_id',
        integration.id
      )
      .eq(
        'is_active',
        true
      )
      .single()

    if (
      adAccountError ||
      !adAccount
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Conta Meta ativa não encontrada.',
        },
        {
          status: 404,
        }
      )
    }

    const currency =
      adAccount.currency?.toUpperCase()

    /*
     * Conta já está em BRL:
     * não precisamos buscar câmbio.
     */
    if (currency === 'BRL') {
  const {
    data: appliedInsights,
    error: applyError,
  } = await admin.rpc(
    'apply_exchange_rates_to_insights',
    {
      p_project_id:
        projectId,

      p_ad_account_id:
        adAccount.id,

      p_start_date:
        startDate,

      p_end_date:
        endDate,
    }
  )

  if (applyError) {
    console.error(
      'BRL APPLY ERROR:',
      applyError
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          'Erro ao aplicar valores em BRL.',
        details:
          applyError.message,
      },
      {
        status: 500,
      }
    )
  }

  return NextResponse.json({
    ok: true,

    currency: 'BRL',

    message:
      'A conta já utiliza BRL.',

    imported: 0,

    appliedInsights:
      appliedInsights ?? 0,
  })
}

    /*
     * Na V1 vamos implementar
     * USD -> BRL.
     */
    if (currency !== 'USD') {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Moeda ${currency ?? 'desconhecida'} ainda não suportada.`,
        },
        {
          status: 400,
        }
      )
    }

    /*
     * =====================================================
     * BANCO CENTRAL DO BRASIL
     * =====================================================
     *
     * Começamos 7 dias antes para termos
     * uma cotação anterior disponível
     * caso a primeira data seja sábado,
     * domingo ou feriado.
     */

    const queryStartDate =
      subtractDays(
        startDate,
        7
      )

    const endpoint =
      'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)'

    const params =
      new URLSearchParams()

    params.set(
      '@moeda',
      "'USD'"
    )

    params.set(
      '@dataInicial',
      `'${isoToBcbDate(
        queryStartDate
      )}'`
    )

    params.set(
      '@dataFinalCotacao',
      `'${isoToBcbDate(
        endDate
      )}'`
    )

    params.set(
      '$format',
      'json'
    )

    params.set(
      '$select',
      [
        'cotacaoVenda',
        'dataHoraCotacao',
        'tipoBoletim',
      ].join(',')
    )

    const url =
      `${endpoint}?${params.toString()}`

    const response =
      await fetch(
        url,
        {
          cache: 'no-store',
        }
      )

    if (!response.ok) {
      console.error(
        'BCB PTAX HTTP ERROR:',
        response.status
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'Não foi possível consultar a PTAX do Banco Central.',
        },
        {
          status: 502,
        }
      )
    }

    const data: BcbResponse =
      await response.json()

    const quotations =
      data.value ?? []

    /*
     * Mantemos apenas o boletim
     * oficial de fechamento.
     */
    const closingRates =
      quotations.filter(
        (quotation) =>
          quotation.tipoBoletim ===
            'Fechamento' &&
          typeof quotation.cotacaoVenda ===
            'number'
      )

    /*
     * Uma linha por dia útil.
     */
    const ratesByDate =
      new Map<
        string,
        number
      >()

    for (
      const quotation
      of closingRates
    ) {
      const rateDate =
        extractIsoDate(
          quotation.dataHoraCotacao
        )

      if (
        !rateDate ||
        quotation.cotacaoVenda ==
          null
      ) {
        continue
      }

      ratesByDate.set(
        rateDate,
        quotation.cotacaoVenda
      )
    }

    const rows =
      Array.from(
        ratesByDate.entries()
      ).map(
        ([rateDate, rate]) => ({
          base_currency:
            'USD',

          quote_currency:
            'BRL',

          rate_date:
            rateDate,

          rate,

          source:
            'BCB_PTAX_FECHAMENTO',
        })
      )

    if (rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'O Banco Central não retornou cotações de fechamento para o período.',
        },
        {
          status: 404,
        }
      )
    }

    /*
     * =====================================================
     * SUPABASE
     * =====================================================
     */

    const {
      error: upsertError,
    } = await admin
      .from('exchange_rates')
      .upsert(
        rows,
        {
          onConflict:
            'base_currency,quote_currency,rate_date',
        }
      )

    if (upsertError) {
      console.error(
        'EXCHANGE RATE UPSERT ERROR:',
        upsertError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'Erro ao salvar as cotações.',
          details:
            upsertError.message,
        },
        {
          status: 500,
        }
      )
    }
const {
  data: appliedInsights,
  error: applyError,
} = await admin.rpc(
  'apply_exchange_rates_to_insights',
  {
    p_project_id:
      projectId,

    p_ad_account_id:
      adAccount.id,

    p_start_date:
      startDate,

    p_end_date:
      endDate,
  }
)

if (applyError) {
  console.error(
    'USD APPLY ERROR:',
    applyError
  )

  return NextResponse.json(
    {
      ok: false,
      error:
        'As cotações foram salvas, mas não foi possível aplicá-las aos Insights.',
      details:
        applyError.message,
    },
    {
      status: 500,
    }
  )
}
    return NextResponse.json({
      ok: true,

      currency: 'USD',

      pair:
        'USD/BRL',

      requestedPeriod: {
        startDate,
        endDate,
      },

      queriedFrom:
        queryStartDate,

      source:
        'Banco Central do Brasil - PTAX',

      imported:
        rows.length,

      appliedInsights:
        appliedInsights ?? 0,  
    })
  } catch (error) {
    console.error(
      'EXCHANGE RATE SYNC ERROR:',
      error
    )
    
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao sincronizar câmbio.',
      },
      {
        status: 500,
      }
    )
  }
}