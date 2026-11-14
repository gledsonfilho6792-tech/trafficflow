import {
  createClient,
} from '@/lib/supabase/server'


type Props = {
  projectId: string

  startDate: string
  endDate: string

  salesStartIso: string
  salesEndExclusiveIso: string

  currency: string
}


type AlertTone =
  | 'success'
  | 'warning'
  | 'negative'
  | 'info'


type OperationalAlert = {
  title: string
  description: string
  tone: AlertTone
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
  currency: string
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


export default async function DashboardOperationalIntelligence({
  projectId,
  startDate,
  endDate,
  salesStartIso,
  salesEndExclusiveIso,
  currency,
}: Props) {
  const supabase =
    await createClient()


  /*
   * =====================================================
   * INSIGHTS POR CAMPANHA
   * =====================================================
   *
   * level=campaign garante que investimento,
   * impressões e cliques não sejam duplicados
   * por conjunto/anúncio.
   * =====================================================
   */

  const {
    data:
      insightRows,

    error:
      insightsError,
  } =
    await supabase
      .from(
        'ad_insights_daily'
      )
      .select(
        `
        campaign_id,
        external_id,
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
    console.error(
      'DASHBOARD CAMPAIGN INSIGHTS ERROR:',
      insightsError
    )
  }


  /*
   * =====================================================
   * VENDAS PAGAS NO PERÍODO
   * =====================================================
   *
   * Precisamos delas para:
   *
   * - receita atribuída por campanha
   * - vendas por campanha
   * - diagnóstico de atribuição
   * =====================================================
   */

  const {
    data:
      paidOrderRows,

    error:
      paidOrdersError,
  } =
    await supabase
      .from(
        'order_attribution'
      )
      .select(
        `
        order_id,
        gross_amount,

        is_attributed,
        attribution_status,

        campaign_id,
        campaign_name
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
    paidOrdersError
  ) {
    console.error(
      'DASHBOARD CAMPAIGN SALES ERROR:',
      paidOrdersError
    )
  }


  /*
   * =====================================================
   * STATUS DOS PEDIDOS
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
        order_status
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
      'DASHBOARD OPERATION STATUS ERROR:',
      periodOrdersError
    )
  }


  const insights =
    insightRows ??
    []


  const paidOrders =
    paidOrderRows ??
    []


  const periodOrders =
    periodOrderRows ??
    []


  /*
   * =====================================================
   * NOMES DE CAMPANHAS
   * =====================================================
   *
   * O order_attribution já traz campaign_name
   * quando existe venda.
   *
   * Para campanhas sem nenhuma venda,
   * buscamos o nome diretamente em campaigns.
   * =====================================================
   */

  const campaignIds =
    Array.from(
      new Set(
        insights
          .map(
            (
              row
            ) =>
              row.campaign_id
          )
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
                'string' &&
              value.length >
                0
          )
      )
    )


  const campaignNameMap =
    new Map<
      string,
      string
    >()


  /*
   * Primeiro aproveitamos nomes já
   * recuperados pela view de atribuição.
   */

  for (
    const order
    of paidOrders
  ) {
    if (
      order.campaign_id &&
      order.campaign_name
    ) {
      campaignNameMap.set(
        order.campaign_id,
        order.campaign_name
      )
    }
  }


  if (
    campaignIds.length >
    0
  ) {
    const {
      data:
        campaignRows,

      error:
        campaignsError,
    } =
      await supabase
        .from(
          'campaigns'
        )
        .select(
          `
          id,
          name
          `
        )
        .in(
          'id',
          campaignIds
        )


    if (
      campaignsError
    ) {
      console.error(
        'DASHBOARD CAMPAIGN NAMES ERROR:',
        campaignsError
      )
    }


    for (
      const campaign
      of campaignRows ??
      []
    ) {
      if (
        campaign.id &&
        campaign.name
      ) {
        campaignNameMap.set(
          campaign.id,
          campaign.name
        )
      }
    }
  }


  /*
   * =====================================================
   * AGREGADO DE MÍDIA POR CAMPANHA
   * =====================================================
   */

  const campaignMediaMap =
    new Map<
      string,
      {
        campaignId:
          string | null

        externalId:
          string | null

        investment:
          number

        impressions:
          number

        clicks:
          number
      }
    >()


  for (
    const row
    of insights
  ) {
    const campaignId =
      typeof row.campaign_id ===
        'string'
        ? row.campaign_id
        : null


    const externalId =
      typeof row.external_id ===
        'string'
        ? row.external_id
        : null


    /*
     * Preferimos o UUID interno.
     * external_id serve de fallback.
     */

    const key =
      campaignId ??
      externalId


    if (
      !key
    ) {
      continue
    }


    const current =
      campaignMediaMap.get(
        key
      ) ?? {
        campaignId,

        externalId,

        investment:
          0,

        impressions:
          0,

        clicks:
          0,
      }


    current.investment +=
      numberValue(
        row.spend_brl
      )


    current.impressions +=
      numberValue(
        row.impressions
      )


    current.clicks +=
      numberValue(
        row.clicks
      )


    campaignMediaMap.set(
      key,
      current
    )
  }


  /*
   * =====================================================
   * VENDAS POR CAMPANHA
   * =====================================================
   */

  const campaignSalesMap =
    new Map<
      string,
      {
        sales: number
        revenue: number
      }
    >()


  for (
    const order
    of paidOrders
  ) {
    if (
      !order.campaign_id
    ) {
      continue
    }


    const current =
      campaignSalesMap.get(
        order.campaign_id
      ) ?? {
        sales:
          0,

        revenue:
          0,
      }


    current.sales +=
      1


    current.revenue +=
      numberValue(
        order.gross_amount
      )


    campaignSalesMap.set(
      order.campaign_id,
      current
    )
  }


  /*
   * =====================================================
   * LINHAS FINAIS
   * =====================================================
   */

  const campaignPerformance =
    Array.from(
      campaignMediaMap.entries()
    )
      .map(
        ([
          key,
          media,
        ]) => {
          const salesData =
            media.campaignId
              ? campaignSalesMap.get(
                  media.campaignId
                )
              : null


          const sales =
            salesData?.sales ??
            0


          const revenue =
            salesData?.revenue ??
            0


          const cpa =
            sales >
            0
              ? media.investment /
                sales
              : 0


          const roas =
            media.investment >
            0
              ? revenue /
                media.investment
              : 0


          const ctr =
            media.impressions >
            0
              ? (
                  media.clicks /
                  media.impressions
                ) *
                100
              : 0


          const name =
            (
              media.campaignId
                ? campaignNameMap.get(
                    media.campaignId
                  )
                : null
            ) ??
            (
              media.externalId
                ? `Campanha ${media.externalId}`
                : `Campanha ${key}`
            )


          return {
            key,

            name,

            externalId:
              media.externalId,

            investment:
              media.investment,

            impressions:
              media.impressions,

            clicks:
              media.clicks,

            sales,

            revenue,

            cpa,

            roas,

            ctr,
          }
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.investment -
          a.investment
      )


  const topCampaigns =
    campaignPerformance
      .slice(
        0,
        5
      )


  /*
   * =====================================================
   * DIAGNÓSTICOS
   * =====================================================
   */

  const totalInvestment =
    campaignPerformance.reduce(
      (
        total,
        campaign
      ) =>
        total +
        campaign.investment,
      0
    )


  const approvedSales =
    paidOrders.length


  const unattributedSales =
    paidOrders.filter(
      (
        order
      ) =>
        order.attribution_status ===
        'unattributed'
    ).length


  const tokenUnresolvedSales =
    paidOrders.filter(
      (
        order
      ) =>
        order.attribution_status ===
        'token_unresolved'
    ).length


  const attributedSales =
    paidOrders.filter(
      (
        order
      ) =>
        order.is_attributed ===
        true
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


  const alerts:
    OperationalAlert[] =
    []


  /*
   * Mídia com investimento,
   * mas nenhuma venda aprovada.
   */

  if (
    totalInvestment >
      0 &&
    approvedSales ===
      0
  ) {
    alerts.push({
      tone:
        'warning',

      title:
        'Investimento sem venda aprovada',

      description:
        `${formatCurrency(
          totalInvestment,
          currency
        )} investidos em mídia no período e nenhuma venda aprovada registrada.`,
    })
  }


  /*
   * Vendas sem sessão resolvida.
   */

  if (
    unattributedSales >
    0
  ) {
    alerts.push({
      tone:
        'warning',

      title:
        'Vendas sem atribuição',

      description:
        `${formatNumber(
          unattributedSales
        )} venda(s) aprovada(s) não foram ligadas a uma sessão de tracking.`,
    })
  }


  /*
   * Token chegou,
   * mas sessão ainda não resolveu.
   */

  if (
    tokenUnresolvedSales >
    0
  ) {
    alerts.push({
      tone:
        'warning',

      title:
        'Tokens de atribuição pendentes',

      description:
        `${formatNumber(
          tokenUnresolvedSales
        )} venda(s) receberam token tf_, mas a sessão ainda não foi resolvida.`,
    })
  }


  /*
   * Reembolso.
   */

  if (
    refundedOrders >
    0
  ) {
    alerts.push({
      tone:
        'info',

      title:
        'Reembolsos registrados',

      description:
        `${formatNumber(
          refundedOrders
        )} pedido(s) gerado(s) no período estão atualmente com status reembolsado.`,
    })
  }


  /*
   * Chargeback/MED.
   */

  if (
    chargebackOrders >
    0
  ) {
    alerts.push({
      tone:
        'negative',

      title:
        'Chargeback ou MED registrado',

      description:
        `${formatNumber(
          chargebackOrders
        )} pedido(s) do período possuem disputa, MED ou chargeback.`,
    })
  }


  /*
   * Cenário positivo:
   * existem vendas e todas estão atribuídas.
   */

  if (
    approvedSales >
      0 &&
    attributedSales ===
      approvedSales
  ) {
    alerts.push({
      tone:
        'success',

      title:
        'Todas as vendas aprovadas estão atribuídas',

      description:
        `${formatNumber(
          attributedSales
        )} de ${formatNumber(
          approvedSales
        )} vendas aprovadas possuem atribuição no Traffic Flow.`,
    })
  }


  /*
   * Sem nada relevante a sinalizar.
   */

  if (
    alerts.length ===
    0
  ) {
    alerts.push({
      tone:
        'success',

      title:
        'Nenhuma ocorrência operacional relevante',

      description:
        'Não há vendas sem atribuição, tokens pendentes, reembolsos ou chargebacks neste período.',
    })
  }


  return (
    <section className="mt-8">

      <div>

        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
          Inteligência
        </p>


        <h2 className="mt-1 text-sm font-semibold text-zinc-200">
          Diagnóstico operacional
        </h2>


        <p className="mt-1 text-xs text-zinc-600">
          Ocorrências objetivas encontradas em mídia, vendas e atribuição.
        </p>

      </div>


      <div className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">

        {/* ===============================================
            DIAGNÓSTICOS
        =============================================== */}

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

          <div className="border-b border-white/[0.05] px-5 py-4">

            <p className="text-xs font-semibold text-zinc-200">
              Atenção da operação
            </p>


            <p className="mt-1 text-[10px] text-zinc-600">
              Baseado somente em ocorrências detectadas nos dados.
            </p>

          </div>


          <div className="divide-y divide-white/[0.05]">

            {alerts.map(
              (
                alert,
                index
              ) => (
                <AlertRow
                  key={`${alert.title}-${index}`}
                  alert={
                    alert
                  }
                />
              )
            )}

          </div>

        </div>


        {/* ===============================================
            CAMPANHAS
        =============================================== */}

        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

          <div className="flex flex-col gap-2 border-b border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-semibold text-zinc-200">
                Performance por campanha
              </p>


              <p className="mt-1 text-[10px] text-zinc-600">
                Top 5 por investimento no período.
              </p>

            </div>


            <p className="text-[10px] text-zinc-600">
              Receita e vendas somente quando atribuídas à campanha.
            </p>

          </div>


          {topCampaigns.length ===
          0 ? (
            <div className="flex min-h-[220px] items-center justify-center p-8 text-center">

              <div>

                <p className="text-sm text-zinc-400">
                  Nenhuma campanha com investimento no período.
                </p>


                <p className="mt-2 text-xs text-zinc-600">
                  Altere o período ou aguarde a sincronização da Meta.
                </p>

              </div>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-[900px] w-full">

                <thead>

                  <tr className="border-b border-white/[0.05] text-left">

                    <TableHead>
                      Campanha
                    </TableHead>

                    <TableHead
                      align="right"
                    >
                      Investimento
                    </TableHead>

                    <TableHead
                      align="right"
                    >
                      Vendas
                    </TableHead>

                    <TableHead
                      align="right"
                    >
                      Receita
                    </TableHead>

                    <TableHead
                      align="right"
                    >
                      CPA
                    </TableHead>

                    <TableHead
                      align="right"
                    >
                      ROAS
                    </TableHead>

                    <TableHead
                      align="right"
                    >
                      CTR
                    </TableHead>

                  </tr>

                </thead>


                <tbody>

                  {topCampaigns.map(
                    (
                      campaign
                    ) => (
                      <tr
                        key={
                          campaign.key
                        }
                        className="border-b border-white/[0.04] last:border-b-0"
                      >

                        <td className="max-w-[320px] px-5 py-4">

                          <p
                            className="truncate text-xs font-medium text-zinc-300"
                            title={
                              campaign.name
                            }
                          >
                            {campaign.name}
                          </p>


                          {campaign.externalId && (
                            <p className="mt-1 truncate text-[9px] text-zinc-700">
                              ID {campaign.externalId}
                            </p>
                          )}

                        </td>


                        <TableCell>
                          {formatCurrency(
                            campaign.investment,
                            currency
                          )}
                        </TableCell>


                        <TableCell>
                          {formatNumber(
                            campaign.sales
                          )}
                        </TableCell>


                        <TableCell>
                          {formatCurrency(
                            campaign.revenue,
                            currency
                          )}
                        </TableCell>


                        <TableCell>
                          {campaign.sales >
                          0
                            ? formatCurrency(
                                campaign.cpa,
                                currency
                              )
                            : '—'}
                        </TableCell>


                        <TableCell>
                          {campaign.investment >
                          0
                            ? formatMultiplier(
                                campaign.roas
                              )
                            : '—'}
                        </TableCell>


                        <TableCell>
                          {formatPercent(
                            campaign.ctr
                          )}
                        </TableCell>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

    </section>
  )
}


function AlertRow({
  alert,
}: {
  alert:
    OperationalAlert
}) {
  const dotClass =
    alert.tone ===
    'success'
      ? 'bg-emerald-400'
      : alert.tone ===
          'warning'
        ? 'bg-amber-400'
        : alert.tone ===
            'negative'
          ? 'bg-red-400'
          : 'bg-sky-400'


  const titleClass =
    alert.tone ===
    'success'
      ? 'text-emerald-300'
      : alert.tone ===
          'warning'
        ? 'text-amber-300'
        : alert.tone ===
            'negative'
          ? 'text-red-300'
          : 'text-sky-300'


  return (
    <div className="flex gap-3 px-5 py-4">

      <div className="pt-[5px]">

        <div
          className={`h-2 w-2 rounded-full ${dotClass}`}
        />

      </div>


      <div className="min-w-0">

        <p
          className={`text-xs font-medium ${titleClass}`}
        >
          {alert.title}
        </p>


        <p className="mt-1 text-[10px] leading-4 text-zinc-600">
          {alert.description}
        </p>

      </div>

    </div>
  )
}


function TableHead({
  children,
  align =
    'left',
}: {
  children:
    React.ReactNode

  align?:
    'left' |
    'right'
}) {
  return (
    <th
      className={`px-5 py-3 text-[9px] font-medium uppercase tracking-[0.08em] text-zinc-600 ${
        align ===
        'right'
          ? 'text-right'
          : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}


function TableCell({
  children,
}: {
  children:
    React.ReactNode
}) {
  return (
    <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-zinc-400">
      {children}
    </td>
  )
}