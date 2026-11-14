import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createAdminClient,
} from '@/lib/supabase/admin'

import {
  syncMetaStructure,
} from '@/lib/meta/sync-structure'

import {
  syncMetaInsights,
} from '@/lib/meta/sync-insights'


export const dynamic =
  'force-dynamic'

export const maxDuration =
  60


function formatDateInTimezone(
  date: Date,
  timeZone: string
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }
    ).formatToParts(date)


  const year =
    parts.find(
      (part) =>
        part.type === 'year'
    )?.value ?? ''


  const month =
    parts.find(
      (part) =>
        part.type === 'month'
    )?.value ?? ''


  const day =
    parts.find(
      (part) =>
        part.type === 'day'
    )?.value ?? ''


  return `${year}-${month}-${day}`
}


export async function POST(
  request: NextRequest
) {
  const startedAt =
    new Date()


  try {
    /*
     * =====================================================
     * SEGURANÇA
     * =====================================================
     */

    const automationSecret =
      process.env
        .AUTOMATION_SECRET


    if (!automationSecret) {
      return NextResponse.json(
        {
          ok: false,

          error:
            'Automação não configurada.',
        },
        {
          status: 500,
        }
      )
    }


    const authorization =
      request.headers.get(
        'authorization'
      )


    if (
      authorization !==
      `Bearer ${automationSecret}`
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


    const admin =
      createAdminClient()


    /*
     * =====================================================
     * INTEGRAÇÕES META CONECTADAS
     * =====================================================
     */

    const {
      data: integrations,

      error:
        integrationsError,
    } =
      await admin
        .from(
          'integrations'
        )
        .select(
          `
          id,
          project_id
          `
        )
        .eq(
          'provider',
          'meta'
        )
        .eq(
          'integration_type',
          'ads'
        )
        .eq(
          'status',
          'connected'
        )


    if (
      integrationsError
    ) {
      throw new Error(
        integrationsError
          .message
      )
    }


    if (
      !integrations ||
      integrations.length ===
        0
    ) {
      return NextResponse.json({
        ok: true,

        mode:
          'full',

        projectsProcessed:
          0,

        results: [],
      })
    }


    /*
     * =====================================================
     * RESULTADOS
     * =====================================================
     */

    const results: Array<{
      projectId: string

      status:
        | 'success'
        | 'error'
        | 'skipped'

      date?: string

      structure?: {
        campaigns: number
        adSets: number
        ads: number
        total: number

        attributionBackfill?: {
          updatedAds: number
          updatedAdSets: number
          updatedCampaigns: number
          total: number
        }
      }

      insightsReceived?: number
      insightsSaved?: number
      exchangeApplied?: number

      error?: string
    }> = []


    /*
     * =====================================================
     * PROCESSA CADA PROJETO
     * =====================================================
     */

    for (
      const integration
      of integrations
    ) {
      let syncRunId:
        string | null =
        null


      try {
        /*
         * =================================================
         * PROJETO
         * =================================================
         */

        const {
          data: project,

          error:
            projectError,
        } =
          await admin
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
              integration
                .project_id
            )
            .single()


        if (
          projectError ||
          !project
        ) {
          throw new Error(
            'Projeto não encontrado.'
          )
        }


        const timezone =
          project.timezone ||
          'America/Fortaleza'


        const today =
          formatDateInTimezone(
            new Date(),
            timezone
          )


        /*
         * =================================================
         * CONTA META ATIVA
         * =================================================
         */

        const {
          data:
            adAccount,

          error:
            accountError,
        } =
          await admin
            .from(
              'ad_accounts'
            )
            .select(
              `
              id,
              external_id,
              currency
              `
            )
            .eq(
              'project_id',
              integration
                .project_id
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
            .maybeSingle()


        if (
          accountError ||
          !adAccount
        ) {
          results.push({
            projectId:
              integration
                .project_id,

            status:
              'skipped',

            error:
              'Nenhuma conta Meta ativa.',
          })

          continue
        }


        /*
         * =================================================
         * REGISTRA FULL SYNC
         * =================================================
         */

        const {
          data:
            syncRun,

          error:
            syncRunError,
        } =
          await admin
            .from(
              'sync_runs'
            )
            .insert({
              project_id:
                integration
                  .project_id,

              integration_id:
                integration.id,

              provider:
                'meta',

              sync_type:
                'full',

              status:
                'running',

              triggered_by:
                'cron',

              period_start:
                today,

              period_end:
                today,

              started_at:
                new Date()
                  .toISOString(),
            })
            .select(
              'id'
            )
            .single()


        if (
          syncRunError ||
          !syncRun
        ) {
          throw new Error(
            syncRunError
              ?.message ||
            'Erro ao criar sync_run.'
          )
        }


        syncRunId =
          syncRun.id


        /*
         * =================================================
         * TOKEN META
         * =================================================
         */

        const {
          data:
            accessToken,

          error:
            tokenError,
        } =
          await admin.rpc(
            'get_integration_secret',
            {
              p_integration_id:
                integration.id,
            }
          )


        if (
          tokenError ||
          !accessToken
        ) {
          throw new Error(
            tokenError
              ?.message ||
            'Token Meta não encontrado.'
          )
        }


        /*
         * =================================================
         * 1. ESTRUTURA META
         *
         * campaigns
         * ad_sets
         * ads
         *
         * IMPORTANTE:
         * syncMetaStructure() agora também
         * executa nosso attribution backfill.
         * =================================================
         */

        const structure =
          await syncMetaStructure({
            projectId:
              integration
                .project_id,

            adAccountId:
              adAccount.id,

            adAccountExternalId:
              adAccount
                .external_id,

            accessToken,
          })


        /*
         * =================================================
         * 2. INSIGHTS
         *
         * Full Sync:
         *
         * campaign
         * adset
         * ad
         * =================================================
         */

        const insights =
          await syncMetaInsights({
            projectId:
              integration
                .project_id,

            adAccountId:
              adAccount.id,

            adAccountExternalId:
              adAccount
                .external_id,

            adAccountCurrency:
              adAccount.currency,

            accessToken,

            startDate:
              today,

            endDate:
              today,

            levels: [
              'campaign',
              'adset',
              'ad',
            ],
          })


        /*
         * =================================================
         * 3. CÂMBIO
         *
         * Utilizamos as taxas já
         * armazenadas.
         * =================================================
         */

        const {
          data:
            appliedInsights,

          error:
            exchangeError,
        } =
          await admin.rpc(
            'apply_exchange_rates_to_insights',
            {
              p_project_id:
                integration
                  .project_id,

              p_ad_account_id:
                adAccount.id,

              p_start_date:
                today,

              p_end_date:
                today,
            }
          )


        if (
          exchangeError
        ) {
          throw new Error(
            `Câmbio: ${exchangeError.message}`
          )
        }


        /*
         * =================================================
         * ÚLTIMO SYNC
         * =================================================
         */

        const {
          error:
            integrationUpdateError,
        } =
          await admin
            .from(
              'integrations'
            )
            .update({
              last_synced_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              integration.id
            )


        if (
          integrationUpdateError
        ) {
          throw new Error(
            integrationUpdateError
              .message
          )
        }


        /*
         * =================================================
         * FINALIZA SYNC RUN
         * =================================================
         */

        const recordsReceived =
          structure.total +
          insights.totalReceived


        const recordsSaved =
          structure.total +
          insights.totalSaved


        const {
          error:
            syncRunUpdateError,
        } =
          await admin
            .from(
              'sync_runs'
            )
            .update({
              status:
                'success',

              finished_at:
                new Date()
                  .toISOString(),

              records_received:
                recordsReceived,

              records_saved:
                recordsSaved,

              error_message:
                null,

              metadata: {
                mode:
                  'full',

                date:
                  today,

                levels: [
                  'campaign',
                  'adset',
                  'ad',
                ],

                structure,

                attributionBackfill:
                  structure
                    .attributionBackfill,

                insights,

                exchange: {
                  mode:
                    'stored-rates',

                  appliedInsights:
                    Number(
                      appliedInsights ??
                      0
                    ),
                },
              },
            })
            .eq(
              'id',
              syncRunId
            )


        if (
          syncRunUpdateError
        ) {
          throw new Error(
            syncRunUpdateError
              .message
          )
        }


        /*
         * =================================================
         * RESULTADO
         * =================================================
         */

        results.push({
          projectId:
            integration
              .project_id,

          status:
            'success',

          date:
            today,

          structure,

          insightsReceived:
            insights
              .totalReceived,

          insightsSaved:
            insights
              .totalSaved,

          exchangeApplied:
            Number(
              appliedInsights ??
              0
            ),
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Erro inesperado.'


        console.error(
          'META FULL SYNC ERROR:',
          integration
            .project_id,
          message
        )


        /*
         * Se já criamos sync_run,
         * registra o erro.
         */

        if (syncRunId) {
          await admin
            .from(
              'sync_runs'
            )
            .update({
              status:
                'error',

              finished_at:
                new Date()
                  .toISOString(),

              error_message:
                message,
            })
            .eq(
              'id',
              syncRunId
            )
        }


        results.push({
          projectId:
            integration
              .project_id,

          status:
            'error',

          error:
            message,
        })
      }
    }


    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    const finishedAt =
      new Date()


    return NextResponse.json({
      ok: true,

      mode:
        'full',

      startedAt:
        startedAt
          .toISOString(),

      finishedAt:
        finishedAt
          .toISOString(),

      durationMs:
        finishedAt
          .getTime() -
        startedAt
          .getTime(),

      projectsProcessed:
        integrations.length,

      success:
        results.filter(
          (item) =>
            item.status ===
            'success'
        ).length,

      errors:
        results.filter(
          (item) =>
            item.status ===
            'error'
        ).length,

      skipped:
        results.filter(
          (item) =>
            item.status ===
            'skipped'
        ).length,

      results,
    })
  } catch (error) {
    console.error(
      'META FULL SYNC GLOBAL ERROR:',
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