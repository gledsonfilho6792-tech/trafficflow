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


type PerformanceLevel =
  | 'campaign'
  | 'adset'
  | 'ad'


type EntityRow = {
  id: string
  external_id: string
  name: string

  status?: string | null
  effective_status?: string | null

  campaign_id?: string | null
  ad_set_id?: string | null
}


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value)
}


function isPerformanceLevel(
  value: string
): value is PerformanceLevel {
  return [
    'campaign',
    'adset',
    'ad',
  ].includes(value)
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
    date.getUTCFullYear()

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
      type:
        Intl.DateTimeFormatPartTypes
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


function round2(
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
      request.nextUrl
        .searchParams
        .get(
          'projectId'
        )


    const startDate =
      request.nextUrl
        .searchParams
        .get(
          'startDate'
        )


    const endDate =
      request.nextUrl
        .searchParams
        .get(
          'endDate'
        )


    const rawLevel =
      request.nextUrl
        .searchParams
        .get(
          'level'
        ) ??
      'campaign'


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


    if (
      !isPerformanceLevel(
        rawLevel
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'level deve ser campaign, adset ou ad.',
        },
        {
          status: 400,
        }
      )
    }


    const level:
      PerformanceLevel =
      rawLevel


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
     * PERÍODO DE VENDAS
     * =====================================================
     */

    const startIso =
      localMidnightToUtcIso(
        startDate,
        timezone
      )


    const endExclusiveIso =
      localMidnightToUtcIso(
        addDays(
          endDate,
          1
        ),
        timezone
      )


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * ENTIDADES
     * =====================================================
     */

    let entities:
      EntityRow[] =
      []


    if (
      level ===
      'campaign'
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            'campaigns'
          )
          .select(
            `
            id,
            external_id,
            name,
            status,
            effective_status
            `
          )
          .eq(
            'project_id',
            projectId
          )


      if (error) {
        throw new Error(
          `Campanhas: ${error.message}`
        )
      }


      entities =
        data ?? []
    }


    if (
      level ===
      'adset'
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            'ad_sets'
          )
          .select(
            `
            id,
            external_id,
            name,
            status,
            effective_status,
            campaign_id
            `
          )
          .eq(
            'project_id',
            projectId
          )


      if (error) {
        throw new Error(
          `Conjuntos: ${error.message}`
        )
      }


      entities =
        data ?? []
    }


    if (
      level ===
      'ad'
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            'ads'
          )
          .select(
            `
            id,
            external_id,
            name,
            status,
            effective_status,
            campaign_id,
            ad_set_id
            `
          )
          .eq(
            'project_id',
            projectId
          )


      if (error) {
        throw new Error(
          `Anúncios: ${error.message}`
        )
      }


      entities =
        data ?? []
    }


    /*
     * =====================================================
     * INSIGHTS
     * =====================================================
     *
     * Nunca misturamos níveis.
     *
     * campaign → campaign
     * adset    → adset
     * ad       → ad
     *
     * Isso evita duplicar gasto.
     * =====================================================
     */

    const {
      data:
        insightRows,

      error:
        insightsError,
    } =
      await admin
        .from(
          'ad_insights_daily'
        )
        .select(
          `
          campaign_id,
          ad_set_id,
          ad_id,
          spend_brl,
          impressions,
          reach,
          clicks
          `
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'level',
          level
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


    /*
     * =====================================================
     * VENDAS ATRIBUÍDAS
     * =====================================================
     */

    const {
      data:
        orderRows,

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
        `Vendas: ${ordersError.message}`
      )
    }


    /*
     * =====================================================
     * MAPA DE PERFORMANCE
     * =====================================================
     */

    type AggregatedItem = {
      id: string

      externalId:
        string | null

      name:
        string

      status:
        string | null

      effectiveStatus:
        string | null

      campaignId:
        string | null

      adSetId:
        string | null

      spend:
        number

      impressions:
        number

      reach:
        number

      clicks:
        number

      sales:
        number

      revenue:
        number
    }


    const map =
      new Map<
        string,
        AggregatedItem
      >()


    /*
     * Inicializa todas as entidades
     * conhecidas.
     */

    for (
      const entity
      of entities
    ) {
      map.set(
        entity.id,
        {
          id:
            entity.id,

          externalId:
            entity.external_id,

          name:
            entity.name,

          status:
            entity.status ??
            null,

          effectiveStatus:
            entity
              .effective_status ??
            null,

          campaignId:
            entity
              .campaign_id ??
            null,

          adSetId:
            entity
              .ad_set_id ??
            null,

          spend: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,

          sales: 0,
          revenue: 0,
        }
      )
    }


    /*
     * Qual coluna representa a entidade
     * naquele nível?
     */

    function getEntityId(
      row: {
        campaign_id?:
          string | null

        ad_set_id?:
          string | null

        ad_id?:
          string | null
      }
    ) {
      if (
        level ===
        'campaign'
      ) {
        return (
          row.campaign_id ??
          null
        )
      }


      if (
        level ===
        'adset'
      ) {
        return (
          row.ad_set_id ??
          null
        )
      }


      return (
        row.ad_id ??
        null
      )
    }


    /*
     * =====================================================
     * AGREGA META ADS
     * =====================================================
     */

    for (
      const row
      of insightRows ??
      []
    ) {
      const entityId =
        getEntityId(
          row
        )


      if (!entityId) {
        continue
      }


      const current =
        map.get(
          entityId
        )


      if (!current) {
        continue
      }


      current.spend +=
        numberValue(
          row.spend_brl
        )

      current.impressions +=
        numberValue(
          row.impressions
        )

      current.reach +=
        numberValue(
          row.reach
        )

      current.clicks +=
        numberValue(
          row.clicks
        )
    }


    /*
     * =====================================================
     * AGREGA VENDAS
     * =====================================================
     */

    for (
      const order
      of orderRows ??
      []
    ) {
      const entityId =
        getEntityId(
          order
        )


      /*
       * Venda atribuída à sessão,
       * mas ainda sem resolução Meta,
       * não entra na performance
       * de uma entidade específica.
       */
      if (!entityId) {
        continue
      }


      const current =
        map.get(
          entityId
        )


      if (!current) {
        continue
      }


      current.sales +=
        1

      current.revenue +=
        numberValue(
          order.gross_amount
        )
    }


    /*
     * =====================================================
     * MÉTRICAS DERIVADAS
     * =====================================================
     */

    const items =
      Array.from(
        map.values()
      )
        /*
         * Não precisamos devolver
         * entidades completamente
         * inativas no período.
         */
        .filter(
          (item) =>
            item.spend >
              0 ||
            item.sales >
              0 ||
            item.impressions >
              0 ||
            item.clicks >
              0
        )
        .map(
          (item) => {
            const ctr =
              item.impressions >
              0
                ? (
                    item.clicks /
                    item.impressions
                  ) * 100
                : 0


            const cpc =
              item.clicks >
              0
                ? item.spend /
                  item.clicks
                : 0


            const cpm =
              item.impressions >
              0
                ? (
                    item.spend /
                    item.impressions
                  ) * 1000
                : 0


            const cpa =
              item.sales >
              0
                ? item.spend /
                  item.sales
                : 0


            const roas =
              item.spend >
              0
                ? item.revenue /
                  item.spend
                : 0


            const conversionRate =
              item.clicks >
              0
                ? (
                    item.sales /
                    item.clicks
                  ) * 100
                : 0


            return {
              id:
                item.id,

              externalId:
                item.externalId,

              name:
                item.name,

              status:
                item.status,

              effectiveStatus:
                item
                  .effectiveStatus,

              parent: {
                campaignId:
                  item.campaignId,

                adSetId:
                  item.adSetId,
              },

              ads: {
                spend:
                  round2(
                    item.spend
                  ),

                impressions:
                  Math.round(
                    item.impressions
                  ),

                reach:
                  Math.round(
                    item.reach
                  ),

                clicks:
                  Math.round(
                    item.clicks
                  ),

                ctr:
                  round2(
                    ctr
                  ),

                cpc:
                  round2(
                    cpc
                  ),

                cpm:
                  round2(
                    cpm
                  ),
              },

              sales: {
                approved:
                  item.sales,

                revenue:
                  round2(
                    item.revenue
                  ),
              },

              performance: {
                cpa:
                  round2(
                    cpa
                  ),

                roas:
                  round2(
                    roas
                  ),

                conversionRate:
                  round2(
                    conversionRate
                  ),
              },
            }
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            b.ads.spend -
            a.ads.spend
        )


    /*
     * =====================================================
     * TOTAIS DO NÍVEL
     * =====================================================
     *
     * Como estamos usando apenas
     * UM level de insights, essa soma
     * não duplica investimento.
     * =====================================================
     */

    const totalSpend =
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.ads.spend,
        0
      )


    const totalImpressions =
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.ads.impressions,
        0
      )


    const totalReach =
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.ads.reach,
        0
      )


    const totalClicks =
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.ads.clicks,
        0
      )


    const totalSales =
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.sales.approved,
        0
      )


    const totalRevenue =
      items.reduce(
        (
          total,
          item
        ) =>
          total +
          item.sales.revenue,
        0
      )


    const totalCtr =
      totalImpressions >
      0
        ? (
            totalClicks /
            totalImpressions
          ) * 100
        : 0


    const totalCpc =
      totalClicks >
      0
        ? totalSpend /
          totalClicks
        : 0


    const totalCpm =
      totalImpressions >
      0
        ? (
            totalSpend /
            totalImpressions
          ) * 1000
        : 0


    const totalCpa =
      totalSales >
      0
        ? totalSpend /
          totalSales
        : 0


    const totalRoas =
      totalSpend >
      0
        ? totalRevenue /
          totalSpend
        : 0


    const totalConversionRate =
      totalClicks >
      0
        ? (
            totalSales /
            totalClicks
          ) * 100
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
      },


      level,


      totals: {
        ads: {
          spend:
            round2(
              totalSpend
            ),

          impressions:
            totalImpressions,

          reach:
            totalReach,

          clicks:
            totalClicks,

          ctr:
            round2(
              totalCtr
            ),

          cpc:
            round2(
              totalCpc
            ),

          cpm:
            round2(
              totalCpm
            ),
        },

        sales: {
          approved:
            totalSales,

          revenue:
            round2(
              totalRevenue
            ),
        },

        performance: {
          cpa:
            round2(
              totalCpa
            ),

          roas:
            round2(
              totalRoas
            ),

          conversionRate:
            round2(
              totalConversionRate
            ),
        },
      },


      count:
        items.length,


      items,
    })
  } catch (error) {
    console.error(
      'ATTRIBUTION PERFORMANCE ERROR:',
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