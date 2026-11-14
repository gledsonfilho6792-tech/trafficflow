import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type MetaPagingResponse<T> = {
  data?: T[]
  paging?: {
    next?: string
  }
  error?: {
    message?: string
    type?: string
    code?: number
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

function toNumber(
  value?: string
) {
  if (!value) return 0

  const parsed = Number(value)

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
      await fetch(nextUrl, {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },

        cache: 'no-store',
      })

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
      results.push(...data.data)
    }

    nextUrl =
      data.paging?.next ??
      null
  }

  return results
}

function validateDate(
  value: string
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  )
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
            'As datas devem estar no formato YYYY-MM-DD.',
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
            'startDate não pode ser maior que endDate.',
        },
        {
          status: 400,
        }
      )
    }

    /*
     * =====================================================
     * AUTENTICAÇÃO
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
     * Confirma que o projeto
     * pertence ao usuário.
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

    /*
     * =====================================================
     * CLIENTE ADMINISTRATIVO
     * =====================================================
     */

    const admin =
      createAdminClient()

    /*
     * Integração Meta.
     */
    const {
      data: integration,
      error:
        integrationError,
    } = await admin
      .from('integrations')
      .select(
        `
        id,
        status
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

    if (
      integration.status !==
      'connected'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Meta Ads ainda não está conectada.',
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Conta ativa.
     */
    const {
      data: adAccount,
      error:
        adAccountError,
    } = await admin
      .from('ad_accounts')
      .select(
        `
        id,
        external_id,
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
        'provider',
        'meta'
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
            'Nenhuma conta Meta ativa foi encontrada.',
        },
        {
          status: 404,
        }
      )
    }
    const adAccountId = adAccount.id

    const adAccountExternalId =
       adAccount.external_id

    const adAccountCurrency =
       adAccount.currency

    /*
     * Token Meta do Vault.
     */
    const {
      data: accessToken,
      error: secretError,
    } = await admin.rpc(
      'get_integration_secret',
      {
        p_integration_id:
          integration.id,
      }
    )

    if (
      secretError ||
      !accessToken
    ) {
      console.error(
        'META TOKEN READ ERROR:',
        secretError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'Não foi possível recuperar a credencial da Meta.',
        },
        {
          status: 500,
        }
      )
    }

    /*
     * =====================================================
     * MAPAS DOS IDs LOCAIS
     * =====================================================
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
          adAccount.id
        ),

      admin
        .from('ad_sets')
        .select(
          'id, external_id'
        )
        .eq(
          'ad_account_id',
          adAccount.id
        ),

      admin
        .from('ads')
        .select(
          'id, external_id'
        )
        .eq(
          'ad_account_id',
          adAccount.id
        ),
    ])

    if (
      campaignsResult.error ||
      adSetsResult.error ||
      adsResult.error
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Não foi possível carregar as entidades locais da Meta.',
        },
        {
          status: 500,
        }
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

    /*
     * =====================================================
     * FUNÇÃO PARA SINCRONIZAR UM NÍVEL
     * =====================================================
     */

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

              let campaignId:
                | string
                | null =
                null

              let adSetId:
                | string
                | null =
                null

              let adId:
                | string
                | null =
                null

              if (
                insight.campaign_id
              ) {
                campaignId =
                  campaignMap.get(
                    insight.campaign_id
                  ) ?? null
              }

              if (
                insight.adset_id
              ) {
                adSetId =
                  adSetMap.get(
                    insight.adset_id
                  ) ?? null
              }

              if (
                insight.ad_id
              ) {
                adId =
                  adMap.get(
                    insight.ad_id
                  ) ?? null
              }

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
                  adAccountCurrency ??
                   null,

                spend_native:
                  toNumber(
                    insight.spend
                  ),

                /*
                 * BRL será preenchido
                 * na etapa de câmbio.
                 */
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
                  insight.actions ?? [],

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
          error: upsertError,
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

        if (upsertError) {
          throw new Error(
            `${level}: ${upsertError.message}`
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

    /*
     * =====================================================
     * SINCRONIZAÇÃO DOS 3 NÍVEIS
     * =====================================================
     */

    const campaignResult =
      await syncLevel(
        'campaign'
      )

    const adSetResult =
      await syncLevel(
        'adset'
      )

    const adResult =
      await syncLevel(
        'ad'
      )

    /*
     * Atualiza horário geral.
     */
    await admin
      .from('integrations')
      .update({
        last_synced_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        integration.id
      )

    return NextResponse.json({
      ok: true,

      period: {
        startDate,
        endDate,
      },

      imported: {
        campaign: campaignResult,
        adSet: adSetResult,
        ad: adResult,
      },
    })
  } catch (error) {
    console.error(
      'META INSIGHTS SYNC ERROR:',
      error
    )

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao sincronizar os Insights.',
      },
      {
        status: 500,
      }
    )
  }
}