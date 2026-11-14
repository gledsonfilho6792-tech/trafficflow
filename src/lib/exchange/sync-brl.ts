import { createAdminClient } from '@/lib/supabase/admin'

type BcbQuotation = {
  cotacaoVenda?: number
  dataHoraCotacao?: string
  tipoBoletim?: string
}

type BcbResponse = {
  value?: BcbQuotation[]
}

type Params = {
  projectId: string
  adAccountId: string
  currency: string | null
  startDate: string
  endDate: string
}

function isoToBcbDate(
  isoDate: string
) {
  const [
    year,
    month,
    day,
  ] = isoDate.split('-')

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
    date.getUTCDate() -
      days
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

export async function syncBRLConversion({
  projectId,
  adAccountId,
  currency,
  startDate,
  endDate,
}: Params) {
  const admin =
    createAdminClient()

  const normalizedCurrency =
    currency?.toUpperCase()

  /*
   * Conta BRL.
   */
  if (
    normalizedCurrency ===
    'BRL'
  ) {
    const {
      data,
      error,
    } = await admin.rpc(
      'apply_exchange_rates_to_insights',
      {
        p_project_id:
          projectId,

        p_ad_account_id:
          adAccountId,

        p_start_date:
          startDate,

        p_end_date:
          endDate,
      }
    )

    if (error) {
      throw new Error(
        `BRL: ${error.message}`
      )
    }

    return {
      currency: 'BRL',
      imported: 0,
      appliedInsights:
        Number(data ?? 0),
    }
  }

  /*
   * V1: USD.
   */
  if (
    normalizedCurrency !==
    'USD'
  ) {
    throw new Error(
      `Moeda ${
        normalizedCurrency ??
        'desconhecida'
      } ainda não suportada.`
    )
  }

  /*
   * Busca 7 dias antes para
   * cobrir fim de semana e feriados.
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
    throw new Error(
      `BCB PTAX HTTP ${response.status}`
    )
  }

  const data:
    BcbResponse =
    await response.json()

  const quotations =
    data.value ?? []

  const closingRates =
    quotations.filter(
      (quotation) =>
        quotation.tipoBoletim ===
          'Fechamento' &&
        typeof quotation.cotacaoVenda ===
          'number'
    )

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

  if (
    rows.length === 0
  ) {
    throw new Error(
      'Nenhuma PTAX de fechamento encontrada.'
    )
  }

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
    throw new Error(
      `Câmbio: ${upsertError.message}`
    )
  }

  const {
    data: applied,
    error: applyError,
  } = await admin.rpc(
    'apply_exchange_rates_to_insights',
    {
      p_project_id:
        projectId,

      p_ad_account_id:
        adAccountId,

      p_start_date:
        startDate,

      p_end_date:
        endDate,
    }
  )

  if (applyError) {
    throw new Error(
      `Aplicação do câmbio: ${applyError.message}`
    )
  }

  return {
    currency: 'USD',
    imported:
      rows.length,

    appliedInsights:
      Number(
        applied ?? 0
      ),
  }
}