import { createAdminClient } from '@/lib/supabase/admin'

type MetaPagingResponse<T> = {
  data?: T[]
  paging?: {
    next?: string
  }
  error?: {
    message?: string
  }
}

type MetaAction = {
  action_type?: string
  value?: string
}

type MetaInsight = {
  date_start: string
  date_stop: string

  campaign_id?: string
  adset_id?: string
  ad_id?: string

  spend?: string
  impressions?: string
  reach?: string
  clicks?: string

  cpm?: string
  cpc?: string
  ctr?: string
  frequency?: string

  actions?: MetaAction[]
  action_values?: MetaAction[]
}

type InsightLevel =
  | 'campaign'
  | 'adset'
  | 'ad'

type Params = {
  projectId: string
  adAccountId: string
  adAccountExternalId: string
  adAccountCurrency: string | null
  accessToken: string
  startDate: string
  endDate: string

  levels?: InsightLevel[]
}

function toNumber(
  value?: string
) {
  if (!value) return 0

  const parsed =
    Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

async function fetchAllMetaPages<T>(
  initialUrl: string,
  accessToken: string
): Promise<T[]> {
  const results: T[] = []

  let nextUrl: string | null =
    initialUrl

  while (nextUrl) {
    const response =
      await fetch(
        nextUrl,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        }
      )

    const data:
      MetaPagingResponse<T> =
      await response.json()

    if (
      !response.ok ||
      data.error
    ) {
      throw new Error(
        data.error?.message ||
          'Erro ao consultar Insights da Meta.'
      )
    }

    if (data.data) {
      results.push(
        ...data.data
      )
    }

    nextUrl =
      data.paging?.next ??
      null
  }

  return results
}

export async function syncMetaInsights({
  projectId,
  adAccountId,
  adAccountExternalId,
  adAccountCurrency,
  accessToken,
  startDate,
  endDate,
  levels: requestedLevels,
}: Params) {
  const admin =
    createAdminClient()

  /*
   * Mapas das entidades locais.
   */
  const [
    campaignsResult,
    adSetsResult,
    adsResult,
  ] = await Promise.all([
    admin
      .from('campaigns')
      .select(
        'id, external_id'
      )
      .eq(
        'ad_account_id',
        adAccountId
      ),

    admin
      .from('ad_sets')
      .select(
        'id, external_id'
      )
      .eq(
        'ad_account_id',
        adAccountId
      ),

    admin
      .from('ads')
      .select(
        'id, external_id'
      )
      .eq(
        'ad_account_id',
        adAccountId
      ),
  ])

  if (
    campaignsResult.error ||
    adSetsResult.error ||
    adsResult.error
  ) {
    throw new Error(
      'Erro ao carregar entidades locais da Meta.'
    )
  }

  const campaignMap =
    new Map(
      (
        campaignsResult.data ??
        []
      ).map(
        (item) => [
          item.external_id,
          item.id,
        ]
      )
    )

  const adSetMap =
    new Map(
      (
        adSetsResult.data ??
        []
      ).map(
        (item) => [
          item.external_id,
          item.id,
        ]
      )
    )

  const adMap =
    new Map(
      (
        adsResult.data ??
        []
      ).map(
        (item) => [
          item.external_id,
          item.id,
        ]
      )
    )

  const apiVersion =
    process.env.META_API_VERSION ||
    'v26.0'

  const graphBase =
    `https://graph.facebook.com/${apiVersion}`

  async function syncLevel(
    level: InsightLevel
  ) {
    const insightsUrl =
      new URL(
        `${graphBase}/${adAccountExternalId}/insights`
      )

    insightsUrl.searchParams.set(
      'level',
      level
    )

    insightsUrl.searchParams.set(
      'time_increment',
      '1'
    )

    insightsUrl.searchParams.set(
      'time_range',
      JSON.stringify({
        since: startDate,
        until: endDate,
      })
    )

    insightsUrl.searchParams.set(
      'fields',
      [
        'date_start',
        'date_stop',

        'campaign_id',
        'adset_id',
        'ad_id',

        'spend',
        'impressions',
        'reach',
        'clicks',

        'cpm',
        'cpc',
        'ctr',
        'frequency',

        'actions',
        'action_values',
      ].join(',')
    )

    insightsUrl.searchParams.set(
      'limit',
      '500'
    )

    const insights =
      await fetchAllMetaPages<
        MetaInsight
      >(
        insightsUrl.toString(),
        accessToken
      )

    const rows =
      insights
        .map(
          (insight) => {
            let externalId:
              | string
              | undefined

            const campaignId =
              insight.campaign_id
                ? campaignMap.get(
                    insight.campaign_id
                  ) ?? null
                : null

            const adSetId =
              insight.adset_id
                ? adSetMap.get(
                    insight.adset_id
                  ) ?? null
                : null

            const adId =
              insight.ad_id
                ? adMap.get(
                    insight.ad_id
                  ) ?? null
                : null

            if (
              level ===
              'campaign'
            ) {
              externalId =
                insight.campaign_id
            }

            if (
              level ===
              'adset'
            ) {
              externalId =
                insight.adset_id
            }

            if (
              level === 'ad'
            ) {
              externalId =
                insight.ad_id
            }

            if (!externalId) {
              return null
            }

            return {
              project_id:
                projectId,

              ad_account_id:
                adAccountId,

              campaign_id:
                campaignId,

              ad_set_id:
                adSetId,

              ad_id:
                adId,

              level,

              external_id:
                externalId,

              metric_date:
                insight.date_start,

              currency:
                adAccountCurrency,

              spend_native:
                toNumber(
                  insight.spend
                ),

              fx_rate_to_brl:
                null,

              spend_brl:
                adAccountCurrency ===
                'BRL'
                  ? toNumber(
                      insight.spend
                    )
                  : null,

              impressions:
                Math.trunc(
                  toNumber(
                    insight.impressions
                  )
                ),

              reach:
                Math.trunc(
                  toNumber(
                    insight.reach
                  )
                ),

              clicks:
                Math.trunc(
                  toNumber(
                    insight.clicks
                  )
                ),

              cpm:
                toNumber(
                  insight.cpm
                ),

              cpc:
                toNumber(
                  insight.cpc
                ),

              ctr:
                toNumber(
                  insight.ctr
                ),

              frequency:
                toNumber(
                  insight.frequency
                ),

              actions:
                insight.actions ??
                [],

              action_values:
                insight.action_values ??
                [],

              raw_data:
                insight,

              synced_at:
                new Date()
                  .toISOString(),
            }
          }
        )
        .filter(
          (
            row
          ): row is NonNullable<
            typeof row
          > => Boolean(row)
        )

    if (
      rows.length > 0
    ) {
      const {
        error,
      } = await admin
        .from(
          'ad_insights_daily'
        )
        .upsert(
          rows,
          {
            onConflict:
              'ad_account_id,level,external_id,metric_date',
          }
        )

      if (error) {
        throw new Error(
          `${level}: ${error.message}`
        )
      }
    }

    return {
      received:
        insights.length,

      saved:
        rows.length,
    }
  }

  const selectedLevels =
  requestedLevels ?? [
    'campaign',
    'adset',
    'ad',
  ]

const emptyResult = {
  received: 0,
  saved: 0,
}

const campaign =
  selectedLevels.includes(
    'campaign'
  )
    ? await syncLevel(
        'campaign'
      )
    : emptyResult

const adSet =
  selectedLevels.includes(
    'adset'
  )
    ? await syncLevel(
        'adset'
      )
    : emptyResult

const ad =
  selectedLevels.includes(
    'ad'
  )
    ? await syncLevel(
        'ad'
      )
    : emptyResult

  return {
    campaign,
    adSet,
    ad,

    totalReceived:
      campaign.received +
      adSet.received +
      ad.received,

    totalSaved:
      campaign.saved +
      adSet.saved +
      ad.saved,
  }
}