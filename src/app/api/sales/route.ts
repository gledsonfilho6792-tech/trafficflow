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


type SalesSortKey =
  | 'date'
  | 'value'
  | 'customer'
  | 'status'


type SortDirection =
  | 'asc'
  | 'desc'


const sortColumns:
  Record<
    SalesSortKey,
    string
  > = {
  date:
    'order_created_at',

  value:
    'gross_amount',

  customer:
    'customer_name',

  status:
    'order_status',
}


function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(
      value
    )
}


function isSalesSortKey(
  value: string
): value is SalesSortKey {
  return [
    'date',
    'value',
    'customer',
    'status',
  ].includes(
    value
  )
}


function isSortDirection(
  value: string
): value is SortDirection {
  return (
    value ===
      'asc' ||
    value ===
      'desc'
  )
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


  const year =
    Number(
      match[1]
    )


  const month =
    Number(
      match[2]
    )


  const day =
    Number(
      match[3]
    )


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
      ) - 1,

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


function safeSearchValue(
  value: string
) {
  return value
    .replace(
      /[,%()*]/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}


export async function GET(
  request: NextRequest
) {
  try {
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
          status:
            401,
        }
      )
    }


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


    const status =
      params.get(
        'status'
      ) ??
      'all'


    const provider =
      params.get(
        'provider'
      ) ??
      'all'


    const paymentMethod =
      params.get(
        'paymentMethod'
      ) ??
      'all'


    const attribution =
      params.get(
        'attribution'
      ) ??
      'all'


    const campaign =
      params.get(
        'campaign'
      ) ??
      'all'


    const offer =
      params.get(
        'offer'
      ) ??
      'all'


    const rawSearch =
      params.get(
        'search'
      ) ??
      ''


    const rawSortBy =
      params.get(
        'sortBy'
      ) ??
      'date'


    const rawSortDirection =
      params.get(
        'sortDirection'
      ) ??
      'desc'


    const page =
      Math.max(
        1,

        Number(
          params.get(
            'page'
          ) ??
          1
        ) ||
        1
      )


    const limit =
      Math.min(
        100,

        Math.max(
          10,

          Number(
            params.get(
              'limit'
            ) ??
            50
          ) ||
          50
        )
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
          status:
            400,
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
          status:
            400,
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
          status:
            400,
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
          status:
            400,
        }
      )
    }


    if (
      !isSalesSortKey(
        rawSortBy
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Ordenação inválida.',
        },
        {
          status:
            400,
        }
      )
    }


    if (
      !isSortDirection(
        rawSortDirection
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Direção de ordenação inválida.',
        },
        {
          status:
            400,
        }
      )
    }


    const sortBy:
      SalesSortKey =
      rawSortBy


    const sortDirection:
      SortDirection =
      rawSortDirection


    const {
      data:
        project,

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
          status:
            404,
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


    const search =
      safeSearchValue(
        rawSearch
      )


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * RESUMO + FILTROS + ANÁLISE
     * =====================================================
     */

    const [
      summaryResult,
      filterOptionsResult,
      analysisResult,
    ] =
      await Promise.all([
        admin.rpc(
          'get_sales_summary_filtered',
          {
            p_project_id:
              projectId,

            p_start:
              startIso,

            p_end:
              endExclusiveIso,

            p_status:
              status,

            p_provider:
              provider,

            p_payment_method:
              paymentMethod,

            p_attribution:
              attribution,

            p_campaign:
              campaign,

            p_offer:
              offer,

            p_search:
              search ||
              null,
          }
        ),

        admin.rpc(
          'get_sales_filter_options',
          {
            p_project_id:
              projectId,

            p_start:
              startIso,

            p_end:
              endExclusiveIso,
          }
        ),

        admin.rpc(
          'get_sales_analysis_filtered',
          {
            p_project_id:
              projectId,

            p_start:
              startIso,

            p_end:
              endExclusiveIso,

            p_status:
              status,

            p_provider:
              provider,

            p_payment_method:
              paymentMethod,

            p_attribution:
              attribution,

            p_campaign:
              campaign,

            p_offer:
              offer,

            p_search:
              search ||
              null,
          }
        ),
      ])


    if (
      summaryResult.error
    ) {
      throw new Error(
        `Resumo: ${summaryResult.error.message}`
      )
    }


    if (
      filterOptionsResult.error
    ) {
      throw new Error(
        `Filtros: ${filterOptionsResult.error.message}`
      )
    }


    if (
      analysisResult.error
    ) {
      throw new Error(
        `Análise: ${analysisResult.error.message}`
      )
    }


    const summaryRow =
      Array.isArray(
        summaryResult.data
      )
        ? summaryResult
            .data[0]
        : summaryResult.data


    const filterOptionsRow =
      Array.isArray(
        filterOptionsResult.data
      )
        ? filterOptionsResult
            .data[0]
        : filterOptionsResult
            .data


    const analysisRow =
      Array.isArray(
        analysisResult.data
      )
        ? analysisResult
            .data[0]
        : analysisResult
            .data


    /*
     * =====================================================
     * LISTAGEM
     * =====================================================
     */

    const offset =
      (
        page -
        1
      ) *
      limit


    let query =
      admin
        .from(
          'order_attribution'
        )
        .select(
          `
          order_id,
          provider,

          external_order_id,
          external_transaction_id,
          transaction_identifier,

          order_status,

          currency,
          gross_amount,

          payment_method,
          installments,

          offer_code,

          customer_name,
          customer_email,
          customer_country,
          customer_state,
          customer_city,

          is_attributed,
          attribution_status,
          attribution_method,

          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,

          campaign_name,
          ad_set_name,
          ad_name,

          meta_placement,
          meta_site_source,

          provider_created_at,
          order_created_at,
          paid_at
          `,
          {
            count:
              'exact',
          }
        )
        .eq(
          'project_id',
          projectId
        )
        .gte(
          'order_created_at',
          startIso
        )
        .lt(
          'order_created_at',
          endExclusiveIso
        )


    if (
      status !==
      'all'
    ) {
      query =
        query.ilike(
          'order_status',
          status
        )
    }


    if (
      provider !==
      'all'
    ) {
      query =
        query.ilike(
          'provider',
          provider
        )
    }


    if (
      paymentMethod !==
      'all'
    ) {
      query =
        query.ilike(
          'payment_method',
          paymentMethod
        )
    }


    /*
     * =====================================================
     * ATRIBUIÇÃO
     * =====================================================
     */

    if (
      attribution ===
      'attributed'
    ) {
      query =
        query.eq(
          'is_attributed',
          true
        )
    }


    if (
      attribution ===
      'token_pending'
    ) {
      query =
        query
          .eq(
            'is_attributed',
            false
          )
          .eq(
            'attribution_status',
            'token_unresolved'
          )
    }


    if (
      attribution ===
      'unattributed'
    ) {
      query =
        query
          .eq(
            'is_attributed',
            false
          )
          .or(
            'attribution_status.is.null,attribution_status.neq.token_unresolved'
          )
    }


    if (
      campaign !==
      'all'
    ) {
      query =
        query.eq(
          'campaign_name',
          campaign
        )
    }


    if (
      offer !==
      'all'
    ) {
      query =
        query.eq(
          'offer_code',
          offer
        )
    }


    if (
      search
    ) {
      query =
        query.or(
          [
            `external_order_id.ilike.%${search}%`,
            `external_transaction_id.ilike.%${search}%`,
            `transaction_identifier.ilike.%${search}%`,
            `customer_name.ilike.%${search}%`,
            `customer_email.ilike.%${search}%`,
          ].join(',')
        )
    }


    const sortColumn =
      sortColumns[
        sortBy
      ]


    query =
      query.order(
        sortColumn,
        {
          ascending:
            sortDirection ===
            'asc',

          nullsFirst:
            false,
        }
      )


    if (
      sortColumn !==
      'order_created_at'
    ) {
      query =
        query.order(
          'order_created_at',
          {
            ascending:
              false,
          }
        )
    }


    const {
      data:
        orders,

      count,

      error:
        ordersError,
    } =
      await query.range(
        offset,
        offset +
          limit -
          1
      )


    if (
      ordersError
    ) {
      throw new Error(
        `Vendas: ${ordersError.message}`
      )
    }


    const total =
      count ??
      0


    const totalPages =
      Math.max(
        1,

        Math.ceil(
          total /
          limit
        )
      )


    return NextResponse.json({
      ok:
        true,

      period: {
        startDate,
        endDate,
        timezone,
      },

      currency:
        project.base_currency ??
        'BRL',

      summary: {
        totalOrders:
          numberValue(
            summaryRow
              ?.total_orders
          ),

        approved:
          numberValue(
            summaryRow
              ?.approved
          ),

        pending:
          numberValue(
            summaryRow
              ?.pending
          ),

        refunded:
          numberValue(
            summaryRow
              ?.refunded
          ),

        chargebacks:
          numberValue(
            summaryRow
              ?.chargebacks
          ),

        canceled:
          numberValue(
            summaryRow
              ?.canceled
          ),

        disputed:
          numberValue(
            summaryRow
              ?.disputed
          ),

        attributed:
          numberValue(
            summaryRow
              ?.attributed
          ),

        tokenPending:
          numberValue(
            summaryRow
              ?.token_pending
          ),

        approvedAttributed:
          numberValue(
            summaryRow
              ?.approved_attributed
          ),

        approvedRevenue:
          numberValue(
            summaryRow
              ?.approved_revenue
          ),

        attributedRevenue:
          numberValue(
            summaryRow
              ?.attributed_revenue
          ),

        approvalRate:
          numberValue(
            summaryRow
              ?.approval_rate
          ),

        attributionRate:
          numberValue(
            summaryRow
              ?.attribution_rate
          ),

        averageTicket:
          numberValue(
            summaryRow
              ?.average_ticket
          ),
      },

      filterOptions: {
        paymentMethods:
          filterOptionsRow
            ?.payment_methods ??
          [],

        campaigns:
          filterOptionsRow
            ?.campaigns ??
          [],

        offers:
          filterOptionsRow
            ?.offers ??
          [],
      },

      analysis: {
        paymentMethods:
          analysisRow
            ?.payment_methods ??
          [],

        providers:
          analysisRow
            ?.providers ??
          [],

        statuses:
          analysisRow
            ?.statuses ??
          [],

        campaigns:
          analysisRow
            ?.campaigns ??
          [],

        attribution:
          analysisRow
            ?.attribution ??
          [],
      },

      sort: {
        sortBy,
        sortDirection,
      },

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },

      items:
        orders ??
        [],
    })
  } catch (
    error
  ) {
    console.error(
      'SALES API ERROR:',
      error
    )


    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado.',
      },
      {
        status:
          500,
      }
    )
  }
}