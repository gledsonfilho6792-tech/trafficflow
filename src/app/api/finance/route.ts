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

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    )

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
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
  ].join('-')
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


function nullableString(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  return String(value)
}


function mapMetaEntityRow(
  row:
    Record<
      string,
      unknown
    >
) {
  return {
    level:
      String(
        row.entity_level ??
        ''
      ),

    entityId:
      nullableString(
        row.entity_id
      ),

    externalId:
      nullableString(
        row.entity_external_id
      ),

    name:
      String(
        row.entity_name ??
        'Entidade sem nome'
      ),

    campaignId:
      nullableString(
        row.campaign_id
      ),

    campaignExternalId:
      nullableString(
        row.campaign_external_id
      ),

    campaignName:
      nullableString(
        row.campaign_name
      ),

    adSetId:
      nullableString(
        row.ad_set_id
      ),

    adSetExternalId:
      nullableString(
        row.ad_set_external_id
      ),

    adSetName:
      nullableString(
        row.ad_set_name
      ),

    investment:
      numberValue(
        row.investment_brl
      ),

    impressions:
      numberValue(
        row.impressions
      ),

    clicks:
      numberValue(
        row.clicks
      ),

    attributedOrders:
      numberValue(
        row.attributed_orders
      ),

    attributedRevenue:
      numberValue(
        row.attributed_revenue
      ),

    cpa:
      numberValue(
        row.cpa
      ),

    roas:
      numberValue(
        row.roas
      ),

    ctr:
      numberValue(
        row.ctr
      ),

    cpc:
      numberValue(
        row.cpc
      ),

    cpm:
      numberValue(
        row.cpm
      ),

    missingFxRows:
      numberValue(
        row.missing_fx_rows
      ),
  }
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

    const params =
      request.nextUrl
        .searchParams

    const projectId =
      params.get(
        'projectId'
      )

    const startDate =
      params.get(
        'startDate'
      )

    const endDate =
      params.get(
        'endDate'
      )


    /*
     * =====================================================
     * VALIDAÇÃO
     * =====================================================
     */

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
          name,
          timezone,
          base_currency
          `
        )
        .eq(
          'id',
          projectId
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
     * RPCs
     *
     * ORDEM IMPORTANTE:
     *
     * 1. summary
     * 2. daily
     * 3. campaigns
     * 4. adsets
     * 5. ads
     * 6. costs
     * =====================================================
     */

    const [
      summaryResult,
      dailyResult,
      campaignsResult,
      adSetsResult,
      adsResult,
      costsResult,
    ] =
      await Promise.all([
        /*
         * 1 — RESUMO
         */

        admin.rpc(
          'get_finance_summary',
          {
            p_project_id:
              projectId,

            p_start:
              startIso,

            p_end:
              endExclusiveIso,

            p_start_date:
              startDate,

            p_end_date:
              endDate,
          }
        ),


        /*
         * 2 — EVOLUÇÃO DIÁRIA
         */

        admin.rpc(
          'get_finance_daily',
          {
            p_project_id:
              projectId,

            p_start_date:
              startDate,

            p_end_date:
              endDate,

            p_timezone:
              timezone,
          }
        ),


        /*
         * 3 — CAMPANHAS
         */

        admin.rpc(
          'get_finance_campaigns',
          {
            p_project_id:
              projectId,

            p_start:
              startIso,

            p_end:
              endExclusiveIso,

            p_start_date:
              startDate,

            p_end_date:
              endDate,
          }
        ),


        /*
         * 4 — CONJUNTOS
         */

        admin.rpc(
          'get_finance_meta_entities',
          {
            p_project_id:
              projectId,

            p_start:
              startIso,

            p_end:
              endExclusiveIso,

            p_start_date:
              startDate,

            p_end_date:
              endDate,

            p_level:
              'adset',
          }
        ),


        /*
         * 5 — ANÚNCIOS
         */

        admin.rpc(
          'get_finance_meta_entities',
          {
            p_project_id:
              projectId,

            p_start:
              startIso,

            p_end:
              endExclusiveIso,

            p_start_date:
              startDate,

            p_end_date:
              endDate,

            p_level:
              'ad',
          }
        ),


        /*
         * 6 — CUSTOS CONHECIDOS
         */

        admin.rpc(
          'get_finance_cost_summary',
          {
            p_project_id:
              projectId,

            p_start_date:
              startDate,

            p_end_date:
              endDate,
          }
        ),
      ])


    /*
     * =====================================================
     * ERROS
     * =====================================================
     */

    if (
      summaryResult.error
    ) {
      throw new Error(
        `Resumo financeiro: ${summaryResult.error.message}`
      )
    }


    if (
      dailyResult.error
    ) {
      throw new Error(
        `Evolução financeira: ${dailyResult.error.message}`
      )
    }


    if (
      campaignsResult.error
    ) {
      throw new Error(
        `Campanhas: ${campaignsResult.error.message}`
      )
    }


    if (
      adSetsResult.error
    ) {
      throw new Error(
        `Conjuntos: ${adSetsResult.error.message}`
      )
    }


    if (
      adsResult.error
    ) {
      throw new Error(
        `Anúncios: ${adsResult.error.message}`
      )
    }


    if (
      costsResult.error
    ) {
      throw new Error(
        `Custos: ${costsResult.error.message}`
      )
    }


    /*
     * =====================================================
     * NORMALIZAÇÃO
     * =====================================================
     */

    const summaryRow =
      Array.isArray(
        summaryResult.data
      )
        ? summaryResult
            .data[0]
        : summaryResult
            .data


    const dailyRows =
      Array.isArray(
        dailyResult.data
      )
        ? dailyResult.data
        : []


    const campaignRows =
      Array.isArray(
        campaignsResult.data
      )
        ? campaignsResult.data
        : []


    const adSetRows =
      Array.isArray(
        adSetsResult.data
      )
        ? adSetsResult.data
        : []


    const adRows =
      Array.isArray(
        adsResult.data
      )
        ? adsResult.data
        : []


    const costsRow =
      Array.isArray(
        costsResult.data
      )
        ? costsResult
            .data[0]
        : costsResult
            .data


    /*
     * =====================================================
     * RESULTADO OPERACIONAL CONHECIDO
     * =====================================================
     */

    const approvedRevenue =
      numberValue(
        summaryRow
          ?.approved_revenue
      )


    const investment =
      numberValue(
        summaryRow
          ?.investment_brl
      )


    const knownCosts =
      numberValue(
        costsRow
          ?.total_costs
      )


    const knownTotalCost =
      investment +
      knownCosts


    const knownOperationalResult =
      approvedRevenue -
      knownTotalCost


    const knownRoi =
      knownTotalCost >
      0
        ? (
            knownOperationalResult /
            knownTotalCost
          ) *
          100
        : 0


    const knownMargin =
      approvedRevenue >
      0
        ? (
            knownOperationalResult /
            approvedRevenue
          ) *
          100
        : 0


    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    return NextResponse.json({
      ok: true,


      project: {
        id:
          project.id,

        name:
          project.name,

        timezone,

        currency:
          project.base_currency ??
          'BRL',
      },


      period: {
        startDate,

        endDate,
      },


      /*
       * ===================================================
       * RESUMO
       * ===================================================
       */

      summary: {
        investment,

        impressions:
          numberValue(
            summaryRow
              ?.impressions
          ),

        clicks:
          numberValue(
            summaryRow
              ?.clicks
          ),

        approvedOrders:
          numberValue(
            summaryRow
              ?.approved_orders
          ),

        approvedRevenue,

        metaAttributedOrders:
          numberValue(
            summaryRow
              ?.meta_attributed_orders
          ),

        metaAttributedRevenue:
          numberValue(
            summaryRow
              ?.meta_attributed_revenue
          ),

        averageTicket:
          numberValue(
            summaryRow
              ?.average_ticket
          ),

        cpa:
          numberValue(
            summaryRow
              ?.cpa
          ),

        roas:
          numberValue(
            summaryRow
              ?.roas
          ),

        ctr:
          numberValue(
            summaryRow
              ?.ctr
          ),

        cpc:
          numberValue(
            summaryRow
              ?.cpc
          ),

        cpm:
          numberValue(
            summaryRow
              ?.cpm
          ),

        missingFxRows:
          numberValue(
            summaryRow
              ?.missing_fx_rows
          ),
      },


      /*
       * ===================================================
       * CUSTOS CONHECIDOS
       * ===================================================
       */

      costs: {
        total:
          knownCosts,

        checkoutFees:
          numberValue(
            costsRow
              ?.checkout_fees
          ),

        taxes:
          numberValue(
            costsRow
              ?.taxes
          ),

        tools:
          numberValue(
            costsRow
              ?.tools
          ),

        operational:
          numberValue(
            costsRow
              ?.operational
          ),

        chargebackFees:
          numberValue(
            costsRow
              ?.chargeback_fees
          ),

        refundFees:
          numberValue(
            costsRow
              ?.refund_fees
          ),

        other:
          numberValue(
            costsRow
              ?.other_costs
          ),

        count:
          numberValue(
            costsRow
              ?.expense_count
          ),
      },


      /*
       * ===================================================
       * RESULTADO CONHECIDO
       * ===================================================
       */

      knownResult: {
        revenue:
          approvedRevenue,

        mediaInvestment:
          investment,

        otherKnownCosts:
          knownCosts,

        totalKnownCost:
          knownTotalCost,

        operationalResult:
          knownOperationalResult,

        roi:
          knownRoi,

        margin:
          knownMargin,
      },


      /*
       * ===================================================
       * EVOLUÇÃO DIÁRIA
       * ===================================================
       */

      daily:
        dailyRows.map(
          (
            row:
              Record<
                string,
                unknown
              >
          ) => ({
            date:
              String(
                row.metric_date ??
                ''
              ),

            investment:
              numberValue(
                row
                  .investment_brl
              ),

            approvedRevenue:
              numberValue(
                row
                  .approved_revenue
              ),

            metaAttributedRevenue:
              numberValue(
                row
                  .meta_attributed_revenue
              ),

            approvedOrders:
              numberValue(
                row
                  .approved_orders
              ),

            metaAttributedOrders:
              numberValue(
                row
                  .meta_attributed_orders
              ),
          })
        ),


      /*
       * ===================================================
       * CAMPANHAS
       * ===================================================
       */

      campaigns:
        campaignRows.map(
          (
            row:
              Record<
                string,
                unknown
              >
          ) => ({
            campaignId:
              nullableString(
                row.campaign_id
              ),

            externalId:
              nullableString(
                row
                  .campaign_external_id
              ),

            name:
              String(
                row
                  .campaign_name ??
                'Campanha sem nome'
              ),

            investment:
              numberValue(
                row
                  .investment_brl
              ),

            impressions:
              numberValue(
                row
                  .impressions
              ),

            clicks:
              numberValue(
                row
                  .clicks
              ),

            attributedOrders:
              numberValue(
                row
                  .attributed_orders
              ),

            attributedRevenue:
              numberValue(
                row
                  .attributed_revenue
              ),

            cpa:
              numberValue(
                row.cpa
              ),

            roas:
              numberValue(
                row.roas
              ),

            ctr:
              numberValue(
                row.ctr
              ),

            cpc:
              numberValue(
                row.cpc
              ),

            cpm:
              numberValue(
                row.cpm
              ),

            missingFxRows:
              numberValue(
                row
                  .missing_fx_rows
              ),
          })
        ),


      /*
       * ===================================================
       * CONJUNTOS
       * ===================================================
       */

      adSets:
        adSetRows.map(
          (
            row:
              Record<
                string,
                unknown
              >
          ) =>
            mapMetaEntityRow(
              row
            )
        ),


      /*
       * ===================================================
       * ANÚNCIOS
       * ===================================================
       */

      ads:
        adRows.map(
          (
            row:
              Record<
                string,
                unknown
              >
          ) =>
            mapMetaEntityRow(
              row
            )
        ),
    })
  } catch (error) {
    console.error(
      'FINANCE API ERROR:',
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