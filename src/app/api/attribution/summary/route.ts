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


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


function parseDateOnly(
  value: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(value)


  if (!match) {
    return null
  }


  const year =
    Number(match[1])

  const month =
    Number(match[2])

  const day =
    Number(match[3])


  const test =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    )


  if (
    test.getUTCFullYear() !==
      year ||
    test.getUTCMonth() !==
      month - 1 ||
    test.getUTCDate() !==
      day
  ) {
    return null
  }


  return {
    year,
    month,
    day,
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


  if (!parsed) {
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


  const year =
    date
      .getUTCFullYear()

  const month =
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      '0'
    )

  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      '0'
    )


  return `${year}-${month}-${day}`
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
      type: Intl.DateTimeFormatPartTypes
    ) =>
      Number(
        parts.find(
          (part) =>
            part.type ===
            type
        )?.value ?? 0
      )


  const asUtc =
    Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second')
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


  if (!parsed) {
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


  /*
   * Primeira aproximação.
   */
  let utcTimestamp =
    localTimestamp


  /*
   * Duas/Três passagens resolvem
   * também mudanças de DST.
   */
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
      Number(value)


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


function roundMoney(
  value: number
) {
  return Math.round(
    value * 100
  ) / 100
}


function roundPercentage(
  value: number
) {
  return Math.round(
    value * 100
  ) / 100
}


export async function GET(
  request: NextRequest
) {
  try {
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


    /*
     * =====================================================
     * PARÂMETROS
     * =====================================================
     */

    const projectId =
      request
        .nextUrl
        .searchParams
        .get(
          'projectId'
        )


    const startDate =
      request
        .nextUrl
        .searchParams
        .get(
          'startDate'
        )


    const endDate =
      request
        .nextUrl
        .searchParams
        .get(
          'endDate'
        )


    if (
      !projectId ||
      !isUuid(
        projectId
      )
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


    if (
      !startDate ||
      !parseDateOnly(
        startDate
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'startDate inválida.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      !endDate ||
      !parseDateOnly(
        endDate
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'endDate inválida.',
        },
        {
          status: 400,
        }
      )
    }


    if (
      startDate >
      endDate
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'Período inválido.',
        },
        {
          status: 400,
        }
      )
    }


    /*
     * =====================================================
     * PROJETO
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
          timezone
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


    const timezone =
      project.timezone ||
      'UTC'


    /*
     * =====================================================
     * PERÍODO REAL DO PROJETO
     * =====================================================
     *
     * Evitamos aquele problema antigo
     * de usar -03:00 hardcoded.
     *
     * Cada projeto passa a respeitar
     * seu próprio timezone.
     */

    const startIso =
      localMidnightToUtcIso(
        startDate,
        timezone
      )


    const endExclusiveDate =
      addDays(
        endDate,
        1
      )


    const endExclusiveIso =
      localMidnightToUtcIso(
        endExclusiveDate,
        timezone
      )


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * VENDAS APROVADAS
     * =====================================================
     */

    const {
      data:
        approvedOrders,

      error:
        ordersError,
    } =
      await admin
        .from(
          'order_attribution'
        )
        .select(
          `
          order_id,
          gross_amount,
          is_attributed,
          attribution_status,
          attribution_method,
          tracking_session_id,
          campaign_id,
          ad_set_id,
          ad_id,
          paid_at
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
          startIso
        )
        .lt(
          'paid_at',
          endExclusiveIso
        )


    if (
      ordersError
    ) {
      throw new Error(
        `Atribuição: ${ordersError.message}`
      )
    }


    /*
     * =====================================================
     * INVESTIMENTO
     * =====================================================
     *
     * Usamos level=campaign no total
     * para evitar duplicar investimento.
     *
     * O banco também possui níveis
     * adset e ad.
     */

    const {
      data:
        campaignInsights,

      error:
        insightsError,
    } =
      await admin
        .from(
          'ad_insights_daily'
        )
        .select(
          `
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


    if (
      insightsError
    ) {
      throw new Error(
        `Meta Ads: ${insightsError.message}`
      )
    }


    const orders =
      approvedOrders ??
      []


    const insights =
      campaignInsights ??
      []


    /*
     * =====================================================
     * MÉTRICAS DE VENDAS
     * =====================================================
     */

    const approvedSales =
      orders.length


    const totalRevenue =
      orders.reduce(
        (
          total,
          order
        ) =>
          total +
          numberValue(
            order
              .gross_amount
          ),
        0
      )


    /*
     * Sessão de tracking encontrada.
     */

    const attributedOrders =
      orders.filter(
        (order) =>
          order
            .is_attributed ===
          true
      )


    const attributedSales =
      attributedOrders.length


    const attributedRevenue =
      attributedOrders
        .reduce(
          (
            total,
            order
          ) =>
            total +
            numberValue(
              order
                .gross_amount
            ),
          0
        )


    /*
     * Além da sessão, conseguimos
     * chegar até um anúncio Meta.
     */

    const metaResolvedOrders =
      orders.filter(
        (order) =>
          Boolean(
            order.ad_id
          )
      )


    const metaResolvedSales =
      metaResolvedOrders
        .length


    const metaResolvedRevenue =
      metaResolvedOrders
        .reduce(
          (
            total,
            order
          ) =>
            total +
            numberValue(
              order
                .gross_amount
            ),
          0
        )


    const tokenUnresolvedSales =
      orders.filter(
        (order) =>
          order
            .attribution_status ===
          'token_unresolved'
      ).length


    const unattributedSales =
      orders.filter(
        (order) =>
          order
            .attribution_status ===
          'unattributed'
      ).length


    /*
     * =====================================================
     * META ADS TOTAL
     * =====================================================
     */

    const spend =
      insights.reduce(
        (
          total,
          row
        ) =>
          total +
          numberValue(
            row.spend_brl
          ),
        0
      )


    const impressions =
      insights.reduce(
        (
          total,
          row
        ) =>
          total +
          numberValue(
            row.impressions
          ),
        0
      )


    const clicks =
      insights.reduce(
        (
          total,
          row
        ) =>
          total +
          numberValue(
            row.clicks
          ),
        0
      )


    /*
     * =====================================================
     * PERFORMANCE
     * =====================================================
     */

    const trackingRate =
      approvedSales >
      0
        ? (
            attributedSales /
            approvedSales
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
      totalRevenue >
      0
        ? (
            attributedRevenue /
            totalRevenue
          ) * 100
        : 0


    const cpa =
      approvedSales >
      0
        ? spend /
          approvedSales
        : 0


    const roas =
      spend >
      0
        ? totalRevenue /
          spend
        : 0


    /*
     * Quanto do faturamento conseguimos
     * provar via tracking.
     *
     * Não substitui o ROAS total.
     */
    const trackedRoas =
      spend >
      0
        ? attributedRevenue /
          spend
        : 0


    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    return NextResponse.json({
      ok: true,


      period: {
        startDate,
        endDate,
        timezone,

        startIso,
        endExclusiveIso,
      },


      sales: {
        approved:
          approvedSales,

        revenue:
          roundMoney(
            totalRevenue
          ),
      },


      attribution: {
        attributedSales,

        unattributedSales,

        tokenUnresolvedSales,

        metaResolvedSales,

        trackingRate:
          roundPercentage(
            trackingRate
          ),

        metaResolutionRate:
          roundPercentage(
            metaResolutionRate
          ),

        attributedRevenue:
          roundMoney(
            attributedRevenue
          ),

        metaResolvedRevenue:
          roundMoney(
            metaResolvedRevenue
          ),

        attributedRevenueShare:
          roundPercentage(
            attributedRevenueShare
          ),
      },


      ads: {
        spend:
          roundMoney(
            spend
          ),

        impressions:
          Math.round(
            impressions
          ),

        clicks:
          Math.round(
            clicks
          ),
      },


      performance: {
        cpa:
          roundMoney(
            cpa
          ),

        roas:
          Math.round(
            roas *
              100
          ) / 100,

        trackedRoas:
          Math.round(
            trackedRoas *
              100
          ) / 100,
      },
    })
  } catch (error) {
    console.error(
      'ATTRIBUTION SUMMARY ERROR:',
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