import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createAdminClient,
} from '@/lib/supabase/admin'

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
      process.env.AUTOMATION_SECRET

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
    } = await admin
      .from('integrations')
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

    if (integrationsError) {
      throw new Error(
        integrationsError.message
      )
    }

    if (
      !integrations ||
      integrations.length === 0
    ) {
      return NextResponse.json({
        ok: true,
        mode: 'hot',
        projectsProcessed: 0,
        results: [],
      })
    }

    const results: Array<{
      projectId: string
      status:
        | 'success'
        | 'error'
        | 'skipped'
      date?: string
      received?: number
      saved?: number
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
         * Projeto + timezone
         */

        const {
          data: project,
          error:
            projectError,
        } = await admin
          .from('projects')
          .select(
            'id, timezone'
          )
          .eq(
            'id',
            integration.project_id
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
         * Conta Meta ativa
         */

        const {
          data: adAccount,
          error:
            accountError,
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
            integration.project_id
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
              integration.project_id,

            status:
              'skipped',

            error:
              'Nenhuma conta Meta ativa.',
          })

          continue
        }

        /*
         * Registra a execução
         */

        const {
          data: syncRun,
          error:
            syncRunError,
        } = await admin
          .from('sync_runs')
          .insert({
            project_id:
              integration.project_id,

            integration_id:
              integration.id,

            provider:
              'meta',

            sync_type:
              'hot',

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
          .select('id')
          .single()

        if (
          syncRunError ||
          !syncRun
        ) {
          throw new Error(
            syncRunError?.message ||
              'Erro ao criar sync_run.'
          )
        }

        syncRunId =
          syncRun.id

        /*
         * Recupera token Meta
         */

        const {
          data: accessToken,
          error: tokenError,
        } = await admin.rpc(
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
            tokenError?.message ||
              'Token Meta não encontrado.'
          )
        }

        /*
         * =================================================
         * INSIGHTS DE HOJE
         *
         * Apenas nível campaign.
         * =================================================
         */

        const insights =
          await syncMetaInsights({
            projectId:
              integration.project_id,

            adAccountId:
              adAccount.id,

            adAccountExternalId:
              adAccount.external_id,

            adAccountCurrency:
              adAccount.currency,

            accessToken,

            startDate:
              today,

            endDate:
              today,

            levels: [
              'campaign',
            ],
          })

        /*
         * =================================================
         * BRL
         *
         * Usa a última taxa disponível
         * em exchange_rates.
         * Não consulta o BCB a cada minuto.
         * =================================================
         */

        const {
          data:
            appliedInsights,
          error:
            exchangeError,
        } = await admin.rpc(
          'apply_exchange_rates_to_insights',
          {
            p_project_id:
              integration.project_id,

            p_ad_account_id:
              adAccount.id,

            p_start_date:
              today,

            p_end_date:
              today,
          }
        )

        if (exchangeError) {
          throw new Error(
            `Câmbio: ${exchangeError.message}`
          )
        }

        /*
         * Atualiza último sync
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

        /*
         * Finaliza log
         */

        await admin
          .from('sync_runs')
          .update({
            status:
              'success',

            finished_at:
              new Date()
                .toISOString(),

            records_received:
              insights.totalReceived,

            records_saved:
              insights.totalSaved,

            metadata: {
              mode:
                'hot',

              date:
                today,

              levels: [
                'campaign',
              ],

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

        results.push({
          projectId:
            integration.project_id,

          status:
            'success',

          date:
            today,

          received:
            insights.totalReceived,

          saved:
            insights.totalSaved,

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
          'META HOT SYNC ERROR:',
          integration.project_id,
          message
        )

        if (syncRunId) {
          await admin
            .from('sync_runs')
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
            integration.project_id,

          status:
            'error',

          error:
            message,
        })
      }
    }

    const finishedAt =
      new Date()

    return NextResponse.json({
      ok: true,

      mode:
        'hot',

      startedAt:
        startedAt.toISOString(),

      finishedAt:
        finishedAt.toISOString(),

      durationMs:
        finishedAt.getTime() -
        startedAt.getTime(),

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
      'META HOT SYNC GLOBAL ERROR:',
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