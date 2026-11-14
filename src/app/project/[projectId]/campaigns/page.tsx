import {
  createClient,
} from '@/lib/supabase/server'

import CampaignsPerformance from '@/components/campaigns-performance'


type Props = {
  params: Promise<{
    projectId: string
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


function addDays(
  dateString: string,
  amount: number
) {
  const [
    year,
    month,
    day,
  ] =
    dateString
      .split('-')
      .map(Number)


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + amount
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


export default async function CampaignsPage({
  params,
}: Props) {
  const {
    projectId,
  } =
    await params


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
        timezone,
        base_currency
        `
      )
      .eq(
        'id',
        projectId
      )
      .maybeSingle()


  const timezone =
    project?.timezone ??
    'America/Fortaleza'


  const currency =
    project?.base_currency ??
    'BRL'


  /*
   * Últimos 7 dias,
   * incluindo hoje.
   */

  const initialEndDate =
    formatDateInTimezone(
      new Date(),
      timezone
    )


  const initialStartDate =
    addDays(
      initialEndDate,
      -6
    )


  /*
   * =====================================================
   * INTEGRAÇÃO META
   * =====================================================
   */

  const {
    data:
      metaIntegration,
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


  /*
   * =====================================================
   * CONTA META ATIVA
   * =====================================================
   */

  let activeAdAccount:
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
    metaIntegration?.id &&
    metaIntegration.status ===
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
          metaIntegration.id
        )
        .eq(
          'is_active',
          true
        )
        .maybeSingle()


    activeAdAccount =
      account ??
      null
  }


  /*
   * =====================================================
   * CONTADORES
   * =====================================================
   */

  let campaignsCount =
    0

  let adSetsCount =
    0

  let adsCount =
    0


  if (
    activeAdAccount
  ) {
    const [
      campaignsResult,
      adSetsResult,
      adsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            'campaigns'
          )
          .select(
            '*',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'ad_account_id',
            activeAdAccount.id
          ),

        supabase
          .from(
            'ad_sets'
          )
          .select(
            '*',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'ad_account_id',
            activeAdAccount.id
          ),

        supabase
          .from(
            'ads'
          )
          .select(
            '*',
            {
              count:
                'exact',

              head:
                true,
            }
          )
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'ad_account_id',
            activeAdAccount.id
          ),
      ])


    campaignsCount =
      campaignsResult.count ??
      0


    adSetsCount =
      adSetsResult.count ??
      0


    adsCount =
      adsResult.count ??
      0
  }


  return (
    <main className="p-6 md:p-8">

      <div className="mx-auto max-w-[1800px]">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm text-zinc-500">
              Meta Ads
            </p>


            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Campanhas
            </h1>


            <p className="mt-2 text-sm text-zinc-600">
              Analise mídia, vendas e receita atribuída em toda a estrutura da Meta.
            </p>


            {activeAdAccount && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">

                <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-zinc-400">

                  {activeAdAccount.name ??
                    'Conta Meta Ads'}

                </span>


                {activeAdAccount.account_id && (
                  <span className="text-zinc-600">

                    ID{' '}

                    {activeAdAccount.account_id}

                  </span>
                )}


                {activeAdAccount.currency && (
                  <span className="text-zinc-600">

                    • {activeAdAccount.currency}

                  </span>
                )}

              </div>
            )}

          </div>


          {activeAdAccount ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400">

              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              Sincronização automática

            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-2.5 text-sm text-amber-300">
              Nenhuma conta Meta ativa
            </div>
          )}

        </div>


        {/* CONTADORES */}

        <div className="grid gap-4 sm:grid-cols-3">

          <MetricCard
            title="Campanhas"
            value={
              campaignsCount
            }
          />


          <MetricCard
            title="Conjuntos"
            value={
              adSetsCount
            }
          />


          <MetricCard
            title="Anúncios"
            value={
              adsCount
            }
          />

        </div>


        {/* CONTA NÃO CONFIGURADA */}

        {!activeAdAccount && (
          <section className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-6">

            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/[0.06]">

              <div className="text-center">

                <p className="text-sm text-zinc-400">
                  Nenhuma conta Meta ativa.
                </p>


                <p className="mt-2 text-xs text-zinc-600">
                  Configure sua conta em Integrações para visualizar a performance.
                </p>

              </div>

            </div>

          </section>
        )}


        {/* PERFORMANCE */}

        {activeAdAccount && (
          <CampaignsPerformance
            projectId={
              projectId
            }

            currency={
              currency
            }

            initialStartDate={
              initialStartDate
            }

            initialEndDate={
              initialEndDate
            }

            campaignsCount={
              campaignsCount
            }

            adSetsCount={
              adSetsCount
            }

            adsCount={
              adsCount
            }
          />
        )}


        {/* STATUS DO SYNC */}

        {activeAdAccount && (
          <div className="mt-4 flex justify-end text-[10px] text-zinc-700">

            {metaIntegration?.last_synced_at
              ? `Última sincronização: ${new Date(
                  metaIntegration.last_synced_at
                ).toLocaleString(
                  'pt-BR'
                )}`
              : 'Aguardando primeira sincronização'}

          </div>
        )}

      </div>
    </main>
  )
}


function MetricCard({
  title,
  value,
}: {
  title: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

      <p className="text-xs font-medium text-zinc-500">
        {title}
      </p>


      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>

    </div>
  )
}