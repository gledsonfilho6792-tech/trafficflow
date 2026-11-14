type Campaign = {
  campaignId:
    string | null

  externalId:
    string | null

  name: string

  investment: number

  impressions: number

  clicks: number

  attributedOrders:
    number

  attributedRevenue:
    number

  cpa: number

  roas: number

  ctr: number

  cpc: number

  cpm: number

  missingFxRows:
    number
}


type Props = {
  campaigns:
    Campaign[]

  currency: string
}


function formatMoney(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style:
        'currency',

      currency:
        currency ||
        'BRL',
    }
  ).format(value)
}


function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR'
  ).format(value)
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


export default function FinanceCampaignsTable({
  campaigns,
  currency,
}: Props) {
  const totalInvestment =
    campaigns.reduce(
      (
        total,
        campaign
      ) =>
        total +
        Number(
          campaign.investment ??
          0
        ),
      0
    )


  const totalRevenue =
    campaigns.reduce(
      (
        total,
        campaign
      ) =>
        total +
        Number(
          campaign
            .attributedRevenue ??
          0
        ),
      0
    )


  const totalOrders =
    campaigns.reduce(
      (
        total,
        campaign
      ) =>
        total +
        Number(
          campaign
            .attributedOrders ??
          0
        ),
      0
    )


  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

      <div className="border-b border-white/[0.05] p-5 md:p-6">

        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
          Meta Ads
        </p>

        <h2 className="mt-1 text-sm font-semibold text-zinc-200">
          Performance financeira por campanha
        </h2>

        <p className="mt-1 text-xs text-zinc-600">
          Investimento, mídia e vendas pagas atribuídas às campanhas no período selecionado.
        </p>
      </div>


      {campaigns.length ===
      0 ? (
        <div className="flex min-h-[220px] items-center justify-center p-6">

          <div className="text-center">

            <p className="text-sm text-zinc-500">
              Nenhuma campanha encontrada neste período.
            </p>

            <p className="mt-2 text-xs text-zinc-700">
              Verifique o período selecionado ou a sincronização da Meta.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1500px] border-collapse">

              <thead>
                <tr className="border-b border-white/[0.05]">

                  <TableHead>
                    Campanha
                  </TableHead>

                  <TableHead align="right">
                    Investimento
                  </TableHead>

                  <TableHead align="right">
                    Vendas
                  </TableHead>

                  <TableHead align="right">
                    Receita
                  </TableHead>

                  <TableHead align="right">
                    CPA
                  </TableHead>

                  <TableHead align="right">
                    ROAS
                  </TableHead>

                  <TableHead align="right">
                    Impressões
                  </TableHead>

                  <TableHead align="right">
                    Cliques
                  </TableHead>

                  <TableHead align="right">
                    CTR
                  </TableHead>

                  <TableHead align="right">
                    CPC
                  </TableHead>

                  <TableHead align="right">
                    CPM
                  </TableHead>
                </tr>
              </thead>


              <tbody>

                {campaigns.map(
                  (
                    campaign
                  ) => (
                    <tr
                      key={
                        campaign.externalId ??
                        campaign.campaignId ??
                        campaign.name
                      }
                      className="border-b border-white/[0.035] transition hover:bg-white/[0.015] last:border-0"
                    >

                      <td className="px-5 py-4 md:px-6">

                        <div className="max-w-[390px]">

                          <p className="truncate text-xs font-medium text-zinc-300">
                            {
                              campaign.name
                            }
                          </p>


                          {campaign.externalId && (
                            <p className="mt-1 truncate font-mono text-[9px] text-zinc-700">
                              ID{' '}
                              {
                                campaign.externalId
                              }
                            </p>
                          )}


                          {campaign.missingFxRows >
                            0 && (
                            <p className="mt-1 text-[9px] text-amber-500">
                              Conversão cambial pendente
                            </p>
                          )}
                        </div>
                      </td>


                      <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-medium text-zinc-300">
                        {formatMoney(
                          campaign.investment,
                          currency
                        )}
                      </td>


                      <td className="px-4 py-4 text-right text-xs text-zinc-400">
                        {formatNumber(
                          campaign
                            .attributedOrders
                        )}
                      </td>


                      <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-medium text-zinc-300">
                        {formatMoney(
                          campaign
                            .attributedRevenue,
                          currency
                        )}
                      </td>


                      <td className="whitespace-nowrap px-4 py-4 text-right text-xs text-zinc-400">
                        {campaign.attributedOrders >
                        0
                          ? formatMoney(
                              campaign.cpa,
                              currency
                            )
                          : '—'}
                      </td>


                      <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-medium text-zinc-300">
                        {campaign.investment >
                        0
                          ? `${campaign.roas.toFixed(
                              2
                            )}x`
                          : '—'}
                      </td>


                      <td className="px-4 py-4 text-right text-xs text-zinc-500">
                        {formatNumber(
                          campaign.impressions
                        )}
                      </td>


                      <td className="px-4 py-4 text-right text-xs text-zinc-500">
                        {formatNumber(
                          campaign.clicks
                        )}
                      </td>


                      <td className="whitespace-nowrap px-4 py-4 text-right text-xs text-zinc-500">
                        {formatPercent(
                          campaign.ctr
                        )}
                      </td>


                      <td className="whitespace-nowrap px-4 py-4 text-right text-xs text-zinc-500">
                        {formatMoney(
                          campaign.cpc,
                          currency
                        )}
                      </td>


                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-zinc-500 md:px-6">
                        {formatMoney(
                          campaign.cpm,
                          currency
                        )}
                      </td>
                    </tr>
                  )
                )}

              </tbody>
            </table>
          </div>


          <div className="flex flex-col gap-3 border-t border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">

            <p className="text-[10px] text-zinc-700">

              {campaigns.length}{' '}

              {campaigns.length ===
              1
                ? 'campanha'
                : 'campanhas'}
            </p>


            <div className="flex flex-wrap gap-x-6 gap-y-2">

              <div>

                <span className="text-[9px] uppercase tracking-[0.08em] text-zinc-700">
                  Investimento
                </span>

                <p className="mt-1 text-xs font-medium text-zinc-300">
                  {formatMoney(
                    totalInvestment,
                    currency
                  )}
                </p>
              </div>


              <div>

                <span className="text-[9px] uppercase tracking-[0.08em] text-zinc-700">
                  Vendas
                </span>

                <p className="mt-1 text-xs font-medium text-zinc-300">
                  {formatNumber(
                    totalOrders
                  )}
                </p>
              </div>


              <div>

                <span className="text-[9px] uppercase tracking-[0.08em] text-zinc-700">
                  Receita
                </span>

                <p className="mt-1 text-xs font-medium text-zinc-300">
                  {formatMoney(
                    totalRevenue,
                    currency
                  )}
                </p>
              </div>

            </div>
          </div>
        </>
      )}
    </section>
  )
}


function TableHead({
  children,
  align = 'left',
}: {
  children:
    React.ReactNode

  align?:
    | 'left'
    | 'right'
}) {
  return (
    <th
      className={`px-4 py-3 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600 ${
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