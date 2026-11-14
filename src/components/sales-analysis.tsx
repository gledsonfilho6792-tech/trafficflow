type BreakdownItem = {
  key: string
  orders: number
  approved: number
  revenue: number
}


type StatusItem = {
  key: string
  orders: number
  grossValue: number
}


type CampaignItem = {
  name: string
  externalId:
    string | null

  orders: number
  approved: number
  revenue: number
}


type Props = {
  currency: string

  paymentMethods:
    BreakdownItem[]

  providers:
    BreakdownItem[]

  statuses:
    StatusItem[]

  campaigns:
    CampaignItem[]

  attribution:
    BreakdownItem[]
}


function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR'
  ).format(value)
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


function formatPercent(
  value: number
) {
  return `${value.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        1,

      maximumFractionDigits:
        1,
    }
  )}%`
}


function formatStatus(
  value: string
) {
  const map:
    Record<
      string,
      string
    > = {
    paid:
      'Pago',

    pending:
      'Pendente',

    refunded:
      'Reembolsado',

    chargeback:
      'Chargeback',

    canceled:
      'Cancelado',

    disputed:
      'Em disputa',

    unknown:
      'Não informado',
  }


  return (
    map[value] ??
    value
  )
}


function formatPayment(
  value: string
) {
  const map:
    Record<
      string,
      string
    > = {
    pix:
      'PIX',

    credit_card:
      'Cartão',

    card:
      'Cartão',

    boleto:
      'Boleto',

    unknown:
      'Não informado',
  }


  return (
    map[value] ??
    value
  )
}


function formatProvider(
  value: string
) {
  const map:
    Record<
      string,
      string
    > = {
    applyfy:
      'Applyfy',

    hotmart:
      'Hotmart',

    mundpay:
      'Mundpay',

    wiven:
      'Wiven',

    perfectpay:
      'PerfectPay',

    cartpanda:
      'Cartpanda',

    kiwify:
      'Kiwify',

    greenn:
      'Greenn',

    payt:
      'Payt',

    unknown:
      'Não informado',
  }


  return (
    map[value] ??
    value
  )
}


function formatAttribution(
  value: string
) {
  if (
    value ===
    'attributed'
  ) {
    return 'Atribuídas'
  }


  if (
    value ===
    'token_pending'
  ) {
    return 'Token pendente'
  }


  if (
    value ===
    'unattributed'
  ) {
    return 'Não atribuídas'
  }


  return value
}

export default function SalesAnalysis({
  currency,
  paymentMethods,
  providers,
  statuses,
  campaigns,
  attribution,
}: Props) {
  return (
    <section className="mt-6">

      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
          Análise
        </p>

        <h2 className="mt-1 text-sm font-semibold text-zinc-200">
          Análise da operação
        </h2>

        <p className="mt-1 text-xs text-zinc-600">
          Distribuição dos pedidos considerando os filtros atuais.
        </p>
      </div>


      <div className="mt-5 grid gap-4 xl:grid-cols-2">

        <BreakdownCard
          title="Status dos pedidos"
          items={
            statuses.map(
              (
                item
              ) => ({
                key:
                  item.key,

                label:
                  formatStatus(
                    item.key
                  ),

                orders:
                  Number(
                    item.orders ??
                    0
                  ),

                secondary:
                  formatMoney(
                    Number(
                      item.grossValue ??
                      0
                    ),
                    currency
                  ),
              })
            )
          }
        />


        <BreakdownCard
          title="Formas de pagamento"
          items={
            paymentMethods.map(
              (
                item
              ) => ({
                key:
                  item.key,

                label:
                  formatPayment(
                    item.key
                  ),

                orders:
                  Number(
                    item.orders ??
                    0
                  ),

                secondary:
                  `${formatNumber(
                    Number(
                      item.approved ??
                      0
                    )
                  )} aprovadas`,
              })
            )
          }
        />


        <BreakdownCard
          title="Checkouts"
          items={
            providers.map(
              (
                item
              ) => ({
                key:
                  item.key,

                label:
                  formatProvider(
                    item.key
                  ),

                orders:
                  Number(
                    item.orders ??
                    0
                  ),

                secondary:
                  formatMoney(
                    Number(
                      item.revenue ??
                      0
                    ),
                    currency
                  ),
              })
            )
          }
        />


        <BreakdownCard
          title="Atribuição"
          items={
            attribution.map(
              (
                item
              ) => ({
                key:
                  item.key,

                label:
                  formatAttribution(
                    item.key
                  ),

                orders:
                  Number(
                    item.orders ??
                    0
                  ),

                secondary:
                  formatMoney(
                    Number(
                      item.revenue ??
                      0
                    ),
                    currency
                  ),
              })
            )
          }
        />
      </div>


      <section className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

        <div className="border-b border-white/[0.05] p-5 md:p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            Meta Ads
          </p>

          <h3 className="mt-1 text-sm font-semibold text-zinc-200">
            Performance por campanha
          </h3>

          <p className="mt-1 text-xs text-zinc-600">
            Pedidos atribuídos às campanhas presentes no período filtrado.
          </p>
        </div>


        {campaigns.length ===
        0 ? (
          <div className="flex min-h-[180px] items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm text-zinc-500">
                Nenhuma campanha atribuída neste recorte.
              </p>

              <p className="mt-2 text-xs text-zinc-700">
                Isso é esperado quando os pedidos filtrados não possuem atribuição Meta.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">

              <thead>
                <tr className="border-b border-white/[0.05]">
                  <TableHead>
                    Campanha
                  </TableHead>

                  <TableHead align="right">
                    Pedidos
                  </TableHead>

                  <TableHead align="right">
                    Aprovadas
                  </TableHead>

                  <TableHead align="right">
                    Aprovação
                  </TableHead>

                  <TableHead align="right">
                    Faturamento
                  </TableHead>
                </tr>
              </thead>


              <tbody>
                {campaigns.map(
                  (
                    campaign
                  ) => {
                    const orders =
                      Number(
                        campaign.orders ??
                        0
                      )


                    const approved =
                      Number(
                        campaign.approved ??
                        0
                      )


                    const approvalRate =
                      orders >
                      0
                        ? (
                            approved /
                            orders
                          ) *
                          100
                        : 0


                    return (
                      <tr
                        key={
                          campaign.externalId ??
                          campaign.name
                        }
                        className="border-b border-white/[0.035] last:border-0"
                      >
                        <td className="px-5 py-4 md:px-6">
                          <p className="max-w-[420px] truncate text-xs font-medium text-zinc-300">
                            {
                              campaign.name
                            }
                          </p>

                          {campaign.externalId && (
                            <p className="mt-1 font-mono text-[9px] text-zinc-700">
                              {
                                campaign.externalId
                              }
                            </p>
                          )}
                        </td>


                        <td className="px-4 py-4 text-right text-xs text-zinc-400">
                          {formatNumber(
                            orders
                          )}
                        </td>


                        <td className="px-4 py-4 text-right text-xs text-zinc-400">
                          {formatNumber(
                            approved
                          )}
                        </td>


                        <td className="px-4 py-4 text-right text-xs text-zinc-400">
                          {formatPercent(
                            approvalRate
                          )}
                        </td>


                        <td className="px-5 py-4 text-right text-xs font-medium text-zinc-200 md:px-6">
                          {formatMoney(
                            Number(
                              campaign.revenue ??
                              0
                            ),
                            currency
                          )}
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}


function BreakdownCard({
  title,
  items,
}: {
  title: string

  items: {
    key: string
    label: string
    orders: number
    secondary: string
  }[]
}) {
  const max =
    Math.max(
      1,
      ...items.map(
        (
          item
        ) =>
          item.orders
      )
    )


  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5 md:p-6">

      <h3 className="text-sm font-semibold text-zinc-200">
        {title}
      </h3>


      {items.length ===
      0 ? (
        <p className="mt-6 text-xs text-zinc-600">
          Nenhum dado disponível.
        </p>
      ) : (
        <div className="mt-5 space-y-5">

          {items.map(
            (
              item
            ) => {
              const percentage =
                Math.max(
                  4,
                  (
                    item.orders /
                    max
                  ) *
                    100
                )


              return (
                <div
                  key={
                    item.key
                  }
                >
                  <div className="flex items-center justify-between gap-4">

                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-400">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-1 text-[9px] text-zinc-700">
                        {
                          item.secondary
                        }
                      </p>
                    </div>


                    <p className="shrink-0 text-sm font-semibold text-zinc-200">
                      {formatNumber(
                        item.orders
                      )}
                    </p>
                  </div>


                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">

                    <div
                      className="h-full rounded-full bg-emerald-500/70 transition-all"
                      style={{
                        width:
                          `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              )
            }
          )}
        </div>
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