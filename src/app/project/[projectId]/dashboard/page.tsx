import {
  createClient,
} from '@/lib/supabase/server'

import DashboardFinancialChart from '@/components/dashboard-financial-chart'
import DashboardPeriodFilter from '@/components/dashboard-period-filter'
import DashboardAutoRefresh from '@/components/dashboard-auto-refresh'
import DashboardOperationalIntelligence from '@/components/dashboard-operational-intelligence'


type Props = {
  params: Promise<{
    projectId: string
  }>

  searchParams: Promise<{
    startDate?: string
    endDate?: string
  }>
}


function formatDateInTimezone(
  date: Date,
  timeZone: string
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone,

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    ).formatToParts(
      date
    )


  const year =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'year'
    )?.value ?? ''


  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'month'
    )?.value ?? ''


  const day =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'day'
    )?.value ?? ''


  return `${year}-${month}-${day}`
}


function getDefaultPeriod(
  timeZone: string
) {
  const now =
    new Date()


  const endDate =
    formatDateInTimezone(
      now,
      timeZone
    )


  const start =
    new Date(
      now
    )


  start.setDate(
    start.getDate() -
      6
  )


  const startDate =
    formatDateInTimezone(
      start,
      timeZone
    )


  return {
    startDate,
    endDate,
  }
}


function parseDateOnly(
  value: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(
        value
      )


  if (
    !match
  ) {
    return null
  }


  return {
    year:
      Number(
        match[1]
      ),

    month:
      Number(
        match[2]
      ),

    day:
      Number(
        match[3]
      ),
  }
}


function addDays(
  dateString: string,
  days: number
) {
  const parsed =
    parseDateOnly(
      dateString
    )


  if (
    !parsed
  ) {
    throw new Error(
      'Data inválida.'
    )
  }


  const date =
    new Date(
      Date.UTC(
        parsed.year,
        parsed.month - 1,
        parsed.day + days
      )
    )


  return [
    date.getUTCFullYear(),

    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      '0'
    ),

    String(
      date.getUTCDate()
    ).padStart(
      2,
      '0'
    ),
  ].join(
    '-'
  )
}


function getDateRange(
  startDate: string,
  endDate: string
) {
  const dates:
    string[] =
    []


  let current =
    startDate


  /*
   * Proteção para impedir loop enorme
   * em caso de datas inválidas.
   */

  for (
    let index = 0;
    index < 370;
    index += 1
  ) {
    if (
      current >
      endDate
    ) {
      break
    }


    dates.push(
      current
    )


    current =
      addDays(
        current,
        1
      )
  }


  return dates
}


function getTimezoneOffsetMs(
  date: Date,
  timeZone: string
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone,

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',

        hour:
          '2-digit',

        minute:
          '2-digit',

        second:
          '2-digit',

        hourCycle:
          'h23',
      }
    ).formatToParts(
      date
    )


  const get =
    (
      type:
        Intl.DateTimeFormatPartTypes
    ) =>
      Number(
        parts.find(
          (
            part
          ) =>
            part.type ===
            type
        )?.value ??
        0
      )


  const asUtc =
    Date.UTC(
      get(
        'year'
      ),

      get(
        'month'
      ) -
        1,

      get(
        'day'
      ),

      get(
        'hour'
      ),

      get(
        'minute'
      ),

      get(
        'second'
      )
    )


  return (
    asUtc -
    date.getTime()
  )
}


function localMidnightToUtcIso(
  dateString: string,
  timeZone: string
) {
  const parsed =
    parseDateOnly(
      dateString
    )


  if (
    !parsed
  ) {
    throw new Error(
      'Data inválida.'
    )
  }


  const localTimestamp =
    Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      0,
      0,
      0
    )


  let utcTimestamp =
    localTimestamp


  for (
    let attempt = 0;
    attempt < 3;
    attempt += 1
  ) {
    const offset =
      getTimezoneOffsetMs(
        new Date(
          utcTimestamp
        ),
        timeZone
      )


    utcTimestamp =
      localTimestamp -
      offset
  }


  return new Date(
    utcTimestamp
  ).toISOString()
}


function numberValue(
  value: unknown
) {
  if (
    typeof value ===
      'number' &&
    Number.isFinite(
      value
    )
  ) {
    return value
  }


  if (
    typeof value ===
      'string'
  ) {
    const parsed =
      Number(
        value
      )


    if (
      Number.isFinite(
        parsed
      )
    ) {
      return parsed
    }
  }


  return 0
}


function formatCurrency(
  value: number,
  currency =
    'BRL'
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style:
        'currency',

      currency,
    }
  ).format(
    value
  )
}


function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR'
  ).format(
    value
  )
}


function formatPercent(
  value: number
) {
  return `${value.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  )}%`
}


function formatMultiplier(
  value: number
) {
  return `${value.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  )}x`
}


export default async function DashboardPage({
  params,
  searchParams,
}: Props) {
  const {
    projectId,
  } =
    await params


  const query =
    await searchParams


  const supabase =
    await createClient()


  /*
   * =====================================================
   * PROJETO
   * =====================================================
   */

  const {
    data:
      project,
  } =
    await supabase
      .from(
        'projects'
      )
      .select(
        `
        id,
        name,
        timezone,
        base_currency
        `
      )
      .eq(
        'id',
        projectId
      )
      .single()


  const timeZone =
    project?.timezone ??
    'America/Fortaleza'


  const currency =
    project?.base_currency ??
    'BRL'


  const defaultPeriod =
    getDefaultPeriod(
      timeZone
    )


  const startDate =
    query.startDate ??
    defaultPeriod.startDate


  const endDate =
    query.endDate ??
    defaultPeriod.endDate


  const salesStartIso =
    localMidnightToUtcIso(
      startDate,
      timeZone
    )


  const salesEndExclusiveIso =
    localMidnightToUtcIso(
      addDays(
        endDate,
        1
      ),
      timeZone
    )


  /*
   * =====================================================
   * META
   * =====================================================
   */

  const {
    data:
      integration,
  } =
    await supabase
      .from(
        'integrations'
      )
      .select(
        `
        id,
        status,
        last_synced_at
        `
      )
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
      .maybeSingle()


  let activeAccount:
    | {
        id: string

        name:
          string | null

        account_id:
          string | null

        currency:
          string | null
      }
    | null =
    null


  if (
    integration?.id &&
    integration.status ===
      'connected'
  ) {
    const {
      data:
        account,
    } =
      await supabase
        .from(
          'ad_accounts'
        )
        .select(
          `
          id,
          name,
          account_id,
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
        .maybeSingle()


    activeAccount =
      account ??
      null
  }


  /*
   * =====================================================
   * META INSIGHTS
   * =====================================================
   */

  let spend =
    0

  let impressions =
    0

  let clicks =
    0


  const dailyMediaMap =
    new Map<
      string,
      {
        spend: number
        impressions: number
        clicks: number
      }
    >()


  if (
    activeAccount
  ) {
    const {
      data:
        insights,

      error:
        insightsError,
    } =
      await supabase
        .from(
          'ad_insights_daily'
        )
        .select(
          `
          metric_date,
          spend_brl,
          impressions,
          clicks
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'ad_account_id',
          activeAccount.id
        )
        .eq(
          'level',
          'campaign'
        )
        .gte(
          'metric_date',
          startDate
        )
        .lte(
          'metric_date',
          endDate
        )
        .order(
          'metric_date',
          {
            ascending:
              true,
          }
        )


    if (
      insightsError
    ) {
      console.error(
        'DASHBOARD INSIGHTS ERROR:',
        insightsError
      )
    }


    for (
      const row
      of insights ??
      []
    ) {
      const rowSpend =
        numberValue(
          row.spend_brl
        )


      const rowImpressions =
        numberValue(
          row.impressions
        )


      const rowClicks =
        numberValue(
          row.clicks
        )


      spend +=
        rowSpend


      impressions +=
        rowImpressions


      clicks +=
        rowClicks


      const current =
        dailyMediaMap.get(
          row.metric_date
        ) ?? {
          spend:
            0,

          impressions:
            0,

          clicks:
            0,
        }


      current.spend +=
        rowSpend


      current.impressions +=
        rowImpressions


      current.clicks +=
        rowClicks


      dailyMediaMap.set(
        row.metric_date,
        current
      )
    }
  }


  /*
   * =====================================================
   * VENDAS PAGAS
   * =====================================================
   *
   * Essa consulta alimenta receita aprovada,
   * atribuição e métricas financeiras.
   * =====================================================
   */

  const {
    data:
      paidOrders,

    error:
      ordersError,
  } =
    await supabase
      .from(
        'order_attribution'
      )
      .select(
        `
        order_id,
        gross_amount,
        paid_at,

        is_attributed,
        attribution_status,
        attribution_method,

        tracking_session_id,

        campaign_id,
        ad_set_id,
        ad_id
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .eq(
        'order_status',
        'paid'
      )
      .gte(
        'paid_at',
        salesStartIso
      )
      .lt(
        'paid_at',
        salesEndExclusiveIso
      )


  if (
    ordersError
  ) {
    console.error(
      'DASHBOARD ATTRIBUTION ERROR:',
      ordersError
    )
  }


  const orders =
    paidOrders ??
    []


  const sales =
    orders.length


  const revenue =
    orders.reduce(
      (
        total,
        order
      ) =>
        total +
        numberValue(
          order.gross_amount
        ),
      0
    )


  /*
   * =====================================================
   * PEDIDOS GERADOS NO PERÍODO
   * =====================================================
   *
   * Aqui usamos order_created_at para visualizar
   * o funil e o status operacional dos pedidos
   * que nasceram dentro do período.
   *
   * paid_at preservado indica que o pedido chegou
   * à aprovação em algum momento, mesmo que depois
   * tenha sido reembolsado ou recebido chargeback.
   * =====================================================
   */

  const {
    data:
      periodOrderRows,

    error:
      periodOrdersError,
  } =
    await supabase
      .from(
        'order_attribution'
      )
      .select(
        `
        order_id,
        order_status,
        order_created_at,
        paid_at
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .gte(
        'order_created_at',
        salesStartIso
      )
      .lt(
        'order_created_at',
        salesEndExclusiveIso
      )


  if (
    periodOrdersError
  ) {
    console.error(
      'DASHBOARD PERIOD ORDERS ERROR:',
      periodOrdersError
    )
  }


  const periodOrders =
    periodOrderRows ??
    []


  const totalGeneratedOrders =
    periodOrders.length


  const currentlyPaidOrders =
    periodOrders.filter(
      (
        order
      ) =>
        order.order_status ===
        'paid'
    ).length


  const pendingOrders =
    periodOrders.filter(
      (
        order
      ) =>
        order.order_status ===
        'pending'
    ).length


  const refundedOrders =
    periodOrders.filter(
      (
        order
      ) =>
        order.order_status ===
        'refunded'
    ).length


  const chargebackOrders =
    periodOrders.filter(
      (
        order
      ) =>
        order.order_status ===
          'chargeback' ||
        order.order_status ===
          'disputed'
    ).length


  const canceledOrders =
    periodOrders.filter(
      (
        order
      ) =>
        order.order_status ===
        'canceled'
    ).length


  /*
   * O paid_at não é apagado em refund/chargeback.
   * Portanto é uma boa forma de medir quantos
   * pedidos chegaram a aprovar.
   */

  const everApprovedOrders =
    periodOrders.filter(
      (
        order
      ) =>
        Boolean(
          order.paid_at
        )
    ).length


  const approvalRate =
    totalGeneratedOrders >
    0
      ? (
          everApprovedOrders /
          totalGeneratedOrders
        ) * 100
      : 0


  const clickToOrderRate =
    clicks >
    0
      ? (
          totalGeneratedOrders /
          clicks
        ) * 100
      : 0


      
  /*
   * =====================================================
   * ATRIBUIÇÃO
   * =====================================================
   */

  const attributedOrders =
    orders.filter(
      (
        order
      ) =>
        order.is_attributed ===
        true
    )


  const attributedSales =
    attributedOrders.length


  const attributedRevenue =
    attributedOrders.reduce(
      (
        total,
        order
      ) =>
        total +
        numberValue(
          order.gross_amount
        ),
      0
    )


  const unattributedSales =
    orders.filter(
      (
        order
      ) =>
        order.attribution_status ===
        'unattributed'
    ).length


  const tokenUnresolvedSales =
    orders.filter(
      (
        order
      ) =>
        order.attribution_status ===
        'token_unresolved'
    ).length


  const metaResolvedOrders =
    orders.filter(
      (
        order
      ) =>
        Boolean(
          order.ad_id
        )
    )


  const metaResolvedSales =
    metaResolvedOrders.length


  const metaResolvedRevenue =
    metaResolvedOrders.reduce(
      (
        total,
        order
      ) =>
        total +
        numberValue(
          order.gross_amount
        ),
      0
    )


  const trackingRate =
    sales >
    0
      ? (
          attributedSales /
          sales
        ) * 100
      : 0


  const metaResolutionRate =
    attributedSales >
    0
      ? (
          metaResolvedSales /
          attributedSales
        ) * 100
      : 0


  const attributedRevenueShare =
    revenue >
    0
      ? (
          attributedRevenue /
          revenue
        ) * 100
      : 0


  /*
   * =====================================================
   * CUSTOS CONHECIDOS
   * =====================================================
   */

  const {
    data:
      expenseRows,

    error:
      expensesError,
  } =
    await supabase
      .from(
        'finance_expenses'
      )
      .select(
        `
        amount_brl,
        occurred_on
        `
      )
      .eq(
        'project_id',
        projectId
      )
      .gte(
        'occurred_on',
        startDate
      )
      .lte(
        'occurred_on',
        endDate
      )


  if (
    expensesError
  ) {
    console.error(
      'DASHBOARD EXPENSES ERROR:',
      expensesError
    )
  }


  const knownCosts =
    (
      expenseRows ??
      []
    ).reduce(
      (
        total,
        expense
      ) =>
        total +
        numberValue(
          expense.amount_brl
        ),
      0
    )


  /*
   * =====================================================
   * PERFORMANCE
   * =====================================================
   */

  const metaCpa =
    metaResolvedSales >
    0
      ? spend /
        metaResolvedSales
      : 0


  const metaRoas =
    spend >
    0
      ? metaResolvedRevenue /
        spend
      : 0


  const trackedRoas =
    spend >
    0
      ? attributedRevenue /
        spend
      : 0


  const averageTicket =
    sales >
    0
      ? revenue /
        sales
      : 0


  const knownTotalCost =
    spend +
    knownCosts


  const knownOperationalResult =
    revenue -
    knownTotalCost


  const knownRoi =
    knownTotalCost >
    0
      ? (
          knownOperationalResult /
          knownTotalCost
        ) * 100
      : 0


  const knownMargin =
    revenue >
    0
      ? (
          knownOperationalResult /
          revenue
        ) * 100
      : 0


  /*
   * =====================================================
   * META
   * =====================================================
   */

  const ctr =
    impressions >
    0
      ? (
          clicks /
          impressions
        ) * 100
      : 0


  const cpc =
    clicks >
    0
      ? spend /
        clicks
      : 0


  const cpm =
    impressions >
    0
      ? (
          spend /
          impressions
        ) * 1000
      : 0


  /*
   * =====================================================
   * GRÁFICO FINANCEIRO DIÁRIO
   * =====================================================
   */

  const dailyRevenueMap =
    new Map<
      string,
      number
    >()


  for (
    const order
    of orders
  ) {
    if (
      !order.paid_at
    ) {
      continue
    }


    const date =
      formatDateInTimezone(
        new Date(
          order.paid_at
        ),
        timeZone
      )


    dailyRevenueMap.set(
      date,
      (
        dailyRevenueMap.get(
          date
        ) ??
        0
      ) +
        numberValue(
          order.gross_amount
        )
    )
  }


  const dailyCostMap =
    new Map<
      string,
      number
    >()


  for (
    const expense
    of expenseRows ??
    []
  ) {
    if (
      !expense.occurred_on
    ) {
      continue
    }


    dailyCostMap.set(
      expense.occurred_on,
      (
        dailyCostMap.get(
          expense.occurred_on
        ) ??
        0
      ) +
        numberValue(
          expense.amount_brl
        )
    )
  }


  const financialChartData =
    getDateRange(
      startDate,
      endDate
    ).map(
      (
        date
      ) => {
        const [
          ,
          month,
          day,
        ] =
          date.split(
            '-'
          )


        const investment =
          dailyMediaMap.get(
            date
          )?.spend ??
          0


        const dailyRevenue =
          dailyRevenueMap.get(
            date
          ) ??
          0


        const dailyCosts =
          dailyCostMap.get(
            date
          ) ??
          0


        return {
          date,

          label:
            `${day}/${month}`,

          investment,

          revenue:
            dailyRevenue,

          result:
            dailyRevenue -
            investment -
            dailyCosts,
        }
      }
    )


  /*
   * =====================================================
   * FUNIL
   * =====================================================
   */

  const funnelMaximum =
    Math.max(
      clicks,
      totalGeneratedOrders,
      everApprovedOrders,
      1
    )


  return (
    <main className="p-6 md:p-8">

      <div className="mx-auto max-w-[1600px]">

        {/* HEADER */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm text-zinc-500">
              Performance
            </p>


            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Visão geral
            </h1>


            <p className="mt-2 text-sm text-zinc-600">
              Acompanhe mídia, vendas, atribuição e resultado do projeto{' '}

              {project?.name ??
                'Traffic Flow'}.
            </p>


            {activeAccount && (
              <p className="mt-3 text-xs text-zinc-500">

                Conta Meta:{' '}

                <span className="text-zinc-300">

                  {activeAccount.name ??
                    activeAccount.account_id}

                </span>

              </p>
            )}


            {integration?.status ===
              'connected' && (
              <div className="mt-3">

                <DashboardAutoRefresh
                  lastSyncedAt={
                    integration.last_synced_at
                  }
                />

              </div>
            )}

          </div>


          <DashboardPeriodFilter
            startDate={
              startDate
            }

            endDate={
              endDate
            }
          />

        </div>


        {/* RESULTADO */}

        <section className="mt-8">

          <SectionTitle
            eyebrow="Resultado"
            title="Performance do período"
            description="Visão consolidada de mídia, vendas aprovadas, custos e resultado conhecido."
          />


          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <MetricCard
              title="Investimento Meta"
              value={
                formatCurrency(
                  spend,
                  currency
                )
              }
              subtitle="Investimento em mídia"
            />


            <MetricCard
              title="Receita aprovada"
              value={
                formatCurrency(
                  revenue,
                  currency
                )
              }
              subtitle={`${formatNumber(
                sales
              )} vendas aprovadas`}
            />


            <MetricCard
              title="Resultado conhecido"
              value={
                formatCurrency(
                  knownOperationalResult,
                  currency
                )
              }
              subtitle={`ROI ${formatPercent(
                knownRoi
              )} • Margem ${
                revenue >
                0
                  ? formatPercent(
                      knownMargin
                    )
                  : '—'
              }`}
              tone={
                knownOperationalResult >=
                0
                  ? 'positive'
                  : 'negative'
              }
            />


            <MetricCard
              title="ROAS Meta"
              value={
                spend >
                0
                  ? formatMultiplier(
                      metaRoas
                    )
                  : '—'
              }
              subtitle="Receita atribuída à Meta"
            />


            <MetricCard
              title="Vendas aprovadas"
              value={
                formatNumber(
                  sales
                )
              }
              subtitle="Pedidos atualmente pagos"
            />


            <MetricCard
              title="CPA Meta"
              value={
                metaResolvedSales >
                0
                  ? formatCurrency(
                      metaCpa,
                      currency
                    )
                  : '—'
              }
              subtitle={`${formatNumber(
                metaResolvedSales
              )} vendas resolvidas até Meta`}
            />


            <MetricCard
              title="Ticket médio"
              value={
                sales >
                0
                  ? formatCurrency(
                      averageTicket,
                      currency
                    )
                  : '—'
              }
              subtitle="Receita aprovada / vendas"
            />


            <MetricCard
              title="Custos conhecidos"
              value={
                formatCurrency(
                  knownCosts,
                  currency
                )
              }
              subtitle={`Custo total ${formatCurrency(
                knownTotalCost,
                currency
              )}`}
            />

          </div>
        </section>


        {/* GRÁFICO FINANCEIRO */}

        <section className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-6">

          <div>

            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Evolução
            </p>


            <h2 className="mt-1 text-sm font-semibold text-zinc-200">
              Evolução financeira diária
            </h2>


            <p className="mt-1 text-xs text-zinc-600">
              Receita aprovada, investimento Meta e resultado conhecido por dia.
            </p>

          </div>


          <div className="mt-6">

            <DashboardFinancialChart
              data={
                financialChartData
              }
              currency={
                currency
              }
            />

          </div>

        </section>


        {/* OPERAÇÃO DE VENDAS */}

        <section className="mt-8">

          <SectionTitle
            eyebrow="Vendas"
            title="Operação do período"
            description="Status atual dos pedidos gerados dentro do período selecionado."
          />


          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

            <StatusCard
              title="Pagos"
              value={
                currentlyPaidOrders
              }
              description="Status atual pago"
              tone="positive"
            />


            <StatusCard
              title="Pendentes"
              value={
                pendingOrders
              }
              description="Aguardando pagamento"
            />


            <StatusCard
              title="Reembolsados"
              value={
                refundedOrders
              }
              description="Status atual reembolsado"
              tone={
                refundedOrders >
                0
                  ? 'warning'
                  : 'default'
              }
            />


            <StatusCard
              title="Chargeback / MED"
              value={
                chargebackOrders
              }
              description="Disputas e chargebacks"
              tone={
                chargebackOrders >
                0
                  ? 'negative'
                  : 'default'
              }
            />


            <StatusCard
              title="Cancelados"
              value={
                canceledOrders
              }
              description="Pedidos cancelados"
            />

          </div>
        </section>


        {/* FUNIL */}

        <section className="mt-8">

          <SectionTitle
            eyebrow="Funil"
            title="Conversão operacional"
            description="Da mídia até os pedidos e aprovações registradas pelo Traffic Flow."
          />


          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">

            <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-6">

              <FunnelRow
                label="Cliques Meta"
                value={
                  clicks
                }
                percentage={
                  (
                    clicks /
                    funnelMaximum
                  ) *
                  100
                }
                detail="Entrada de tráfego"
              />


              <div className="my-5 border-t border-white/[0.05]" />


              <FunnelRow
                label="Pedidos gerados"
                value={
                  totalGeneratedOrders
                }
                percentage={
                  (
                    totalGeneratedOrders /
                    funnelMaximum
                  ) *
                  100
                }
                detail={
                  clicks >
                  0
                    ? `${formatPercent(
                        clickToOrderRate
                      )} dos cliques`
                    : 'Conversão sem base de cliques'
                }
              />


              <div className="my-5 border-t border-white/[0.05]" />


              <FunnelRow
                label="Pedidos que aprovaram"
                value={
                  everApprovedOrders
                }
                percentage={
                  (
                    everApprovedOrders /
                    funnelMaximum
                  ) *
                  100
                }
                detail={
                  totalGeneratedOrders >
                  0
                    ? `${formatPercent(
                        approvalRate
                      )} dos pedidos`
                    : 'Sem pedidos no período'
                }
              />

            </div>


            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">

              <MetricCard
                title="Conversão clique → pedido"
                value={
                  clicks >
                  0
                    ? formatPercent(
                        clickToOrderRate
                      )
                    : '—'
                }
                subtitle={`${formatNumber(
                  totalGeneratedOrders
                )} pedidos gerados`}
              />


              <MetricCard
                title="Taxa de aprovação"
                value={
                  totalGeneratedOrders >
                  0
                    ? formatPercent(
                        approvalRate
                      )
                    : '—'
                }
                subtitle={`${formatNumber(
                  everApprovedOrders
                )} pedidos chegaram à aprovação`}
              />

            </div>

          </div>
        </section>

<DashboardOperationalIntelligence
  projectId={
    projectId
  }

  startDate={
    startDate
  }

  endDate={
    endDate
  }

  salesStartIso={
    salesStartIso
  }

  salesEndExclusiveIso={
    salesEndExclusiveIso
  }

  currency={
    currency
  }
/>

        {/* ATRIBUIÇÃO */}

        <section className="mt-8">

          <SectionTitle
            eyebrow="Atribuição"
            title="Cobertura do tracking"
            description="Quanto das vendas aprovadas o Traffic Flow conseguiu ligar à sessão e à mídia."
          />


          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            <MetricCard
              title="Faturamento atribuído"
              value={
                formatCurrency(
                  attributedRevenue,
                  currency
                )
              }
              subtitle={`${formatPercent(
                attributedRevenueShare
              )} do faturamento`}
            />


            <MetricCard
              title="Vendas atribuídas"
              value={
                formatNumber(
                  attributedSales
                )
              }
              subtitle={`${formatPercent(
                trackingRate
              )} das vendas`}
            />


            <MetricCard
              title="Não atribuídas"
              value={
                formatNumber(
                  unattributedSales
                )
              }
              subtitle="Sem sessão resolvida"
            />


            <MetricCard
              title="Tokens pendentes"
              value={
                formatNumber(
                  tokenUnresolvedSales
                )
              }
              subtitle="Token recebido, sessão não resolvida"
            />


            <MetricCard
              title="Resolvidas até Meta"
              value={
                formatNumber(
                  metaResolvedSales
                )
              }
              subtitle={`${formatPercent(
                metaResolutionRate
              )} das atribuídas`}
            />


            <MetricCard
              title="Receita com anúncio"
              value={
                formatCurrency(
                  metaResolvedRevenue,
                  currency
                )
              }
              subtitle="Campanha → conjunto → anúncio"
            />


            <MetricCard
              title="ROAS rastreado"
              value={
                spend >
                0
                  ? formatMultiplier(
                      trackedRoas
                    )
                  : '—'
              }
              subtitle="Toda receita atribuída"
            />

          </div>


          <div className="mt-4 grid gap-4 xl:grid-cols-2">

            <TrackingHealthCard
              title="Tracking das vendas"
              value={
                trackingRate
              }
              primary={`${formatNumber(
                attributedSales
              )} atribuídas`}
              secondary={`${formatNumber(
                sales
              )} vendas aprovadas`}
            />


            <TrackingHealthCard
              title="Resolução Meta"
              value={
                metaResolutionRate
              }
              primary={`${formatNumber(
                metaResolvedSales
              )} até anúncio`}
              secondary={`${formatNumber(
                attributedSales
              )} vendas atribuídas`}
            />

          </div>
        </section>


        {/* TRÁFEGO */}

        <section className="mt-8">

          <SectionTitle
            eyebrow="Tráfego"
            title="Métricas da Meta"
            description="Indicadores consolidados da conta de anúncios no período."
          />


          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

            <MetricCard
              title="Impressões"
              value={
                formatNumber(
                  impressions
                )
              }
            />


            <MetricCard
              title="Cliques"
              value={
                formatNumber(
                  clicks
                )
              }
            />


            <MetricCard
              title="CTR"
              value={
                formatPercent(
                  ctr
                )
              }
            />


            <MetricCard
              title="CPC"
              value={
                clicks >
                0
                  ? formatCurrency(
                      cpc,
                      currency
                    )
                  : '—'
              }
            />


            <MetricCard
              title="CPM"
              value={
                impressions >
                0
                  ? formatCurrency(
                      cpm,
                      currency
                    )
                  : '—'
              }
            />

          </div>
        </section>


        {!activeAccount && (
          <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-6">

            <p className="text-sm text-amber-300">
              Nenhuma conta Meta está ativa.
            </p>


            <p className="mt-2 text-xs text-zinc-500">
              Selecione uma conta em Integrações.
            </p>

          </div>
        )}


        {activeAccount &&
          impressions ===
            0 &&
          spend ===
            0 && (
            <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-6">

              <p className="text-sm text-zinc-400">
                Nenhum dado de mídia encontrado neste período.
              </p>


              <p className="mt-2 text-xs text-zinc-600">
                Aguarde a sincronização automática ou altere o período.
              </p>

            </div>
          )}

      </div>
    </main>
  )
}


function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>

      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
        {eyebrow}
      </p>


      <h2 className="mt-1 text-sm font-semibold text-zinc-200">
        {title}
      </h2>


      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>

    </div>
  )
}


function MetricCard({
  title,
  value,
  subtitle,
  tone =
    'default',
}: {
  title: string
  value: string
  subtitle?: string

  tone?:
    | 'default'
    | 'positive'
    | 'negative'
}) {
  const valueClass =
    tone ===
    'positive'
      ? 'text-emerald-400'
      : tone ===
          'negative'
        ? 'text-red-400'
        : 'text-white'


  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

      <p className="text-xs font-medium text-zinc-500">
        {title}
      </p>


      <p
        className={`mt-3 text-2xl font-semibold tracking-tight ${valueClass}`}
      >
        {value}
      </p>


      {subtitle && (
        <p className="mt-2 text-[10px] leading-4 text-zinc-600">
          {subtitle}
        </p>
      )}

    </div>
  )
}


function StatusCard({
  title,
  value,
  description,
  tone =
    'default',
}: {
  title: string
  value: number
  description: string

  tone?:
    | 'default'
    | 'positive'
    | 'warning'
    | 'negative'
}) {
  const valueClass =
    tone ===
    'positive'
      ? 'text-emerald-400'
      : tone ===
          'warning'
        ? 'text-amber-400'
        : tone ===
            'negative'
          ? 'text-red-400'
          : 'text-white'


  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

      <p className="text-xs font-medium text-zinc-500">
        {title}
      </p>


      <p
        className={`mt-3 text-2xl font-semibold tracking-tight ${valueClass}`}
      >
        {formatNumber(
          value
        )}
      </p>


      <p className="mt-2 text-[10px] leading-4 text-zinc-600">
        {description}
      </p>

    </div>
  )
}


function FunnelRow({
  label,
  value,
  percentage,
  detail,
}: {
  label: string
  value: number
  percentage: number
  detail: string
}) {
  const safePercentage =
    Math.min(
      100,
      Math.max(
        0,
        percentage
      )
    )


  return (
    <div>

      <div className="flex items-end justify-between gap-4">

        <div>

          <p className="text-xs font-medium text-zinc-300">
            {label}
          </p>


          <p className="mt-1 text-[10px] text-zinc-600">
            {detail}
          </p>

        </div>


        <p className="text-xl font-semibold tracking-tight text-white">
          {formatNumber(
            value
          )}
        </p>

      </div>


      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">

        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{
            width:
              `${safePercentage}%`,
          }}
        />

      </div>

    </div>
  )
}


function TrackingHealthCard({
  title,
  value,
  primary,
  secondary,
}: {
  title: string
  value: number
  primary: string
  secondary: string
}) {
  const safeValue =
    Math.min(
      100,
      Math.max(
        0,
        value
      )
    )


  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-xs font-medium text-zinc-400">
            {title}
          </p>


          <p className="mt-1 text-[10px] text-zinc-600">
            {primary} • {secondary}
          </p>

        </div>


        <span className="text-lg font-semibold tracking-tight text-zinc-100">

          {formatPercent(
            safeValue
          )}

        </span>

      </div>


      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.05]">

        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{
            width:
              `${safeValue}%`,
          }}
        />

      </div>

    </div>
  )
}