'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  ChevronDown,
  ChevronRight,
  Megaphone,
  PanelsTopLeft,
  RectangleHorizontal,
} from 'lucide-react'


type CampaignItem = {
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


type MetaEntityItem = {
  level: string

  entityId:
    string | null

  externalId:
    string | null

  name: string

  campaignId:
    string | null

  campaignExternalId:
    string | null

  campaignName:
    string | null

  adSetId:
    string | null

  adSetExternalId:
    string | null

  adSetName:
    string | null

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
    CampaignItem[]

  adSets:
    MetaEntityItem[]

  ads:
    MetaEntityItem[]

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


function campaignKey(
  item: {
    campaignId:
      string | null

    campaignExternalId?:
      string | null

    externalId?:
      string | null
  }
) {
  return (
    item.campaignId ??
    item.campaignExternalId ??
    item.externalId ??
    null
  )
}


function adSetKey(
  item: {
    adSetId:
      string | null

    adSetExternalId?:
      string | null

    entityId?:
      string | null

    externalId?:
      string | null
  }
) {
  return (
    item.adSetId ??
    item.adSetExternalId ??
    item.entityId ??
    item.externalId ??
    null
  )
}


export default function FinanceMetaHierarchy({
  campaigns,
  adSets,
  ads,
  currency,
}: Props) {
  const [
    openCampaigns,
    setOpenCampaigns,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    )


  const [
    openAdSets,
    setOpenAdSets,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    )


  /*
   * =====================================================
   * ÍNDICES
   * =====================================================
   */

  const adSetsByCampaign =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            MetaEntityItem[]
          >()


        for (
          const adSet
          of adSets
        ) {
          const key =
            campaignKey(
              adSet
            )


          if (!key) {
            continue
          }


          const current =
            map.get(
              key
            ) ??
            []


          current.push(
            adSet
          )


          map.set(
            key,
            current
          )
        }


        return map
      },
      [
        adSets,
      ]
    )


  const adsByAdSet =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            MetaEntityItem[]
          >()


        for (
          const ad
          of ads
        ) {
          const key =
            adSetKey(
              ad
            )


          if (!key) {
            continue
          }


          const current =
            map.get(
              key
            ) ??
            []


          current.push(
            ad
          )


          map.set(
            key,
            current
          )
        }


        return map
      },
      [
        ads,
      ]
    )


  /*
   * =====================================================
   * ABRIR / FECHAR
   * =====================================================
   */

  function toggleCampaign(
    key: string
  ) {
    setOpenCampaigns(
      (
        current
      ) => {
        const next =
          new Set(
            current
          )


        if (
          next.has(
            key
          )
        ) {
          next.delete(
            key
          )
        } else {
          next.add(
            key
          )
        }


        return next
      }
    )
  }


  function toggleAdSet(
    key: string
  ) {
    setOpenAdSets(
      (
        current
      ) => {
        const next =
          new Set(
            current
          )


        if (
          next.has(
            key
          )
        ) {
          next.delete(
            key
          )
        } else {
          next.add(
            key
          )
        }


        return next
      }
    )
  }


  /*
   * =====================================================
   * SEM DADOS
   * =====================================================
   */

  if (
    campaigns.length ===
    0
  ) {
    return (
      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

        <Header />


        <div className="flex min-h-[220px] items-center justify-center p-6">

          <div className="text-center">

            <p className="text-sm text-zinc-500">
              Nenhuma estrutura Meta encontrada neste período.
            </p>

            <p className="mt-2 text-xs text-zinc-700">
              Verifique o período selecionado ou a sincronização da conta.
            </p>
          </div>
        </div>
      </section>
    )
  }


  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

      <Header />


      <div className="overflow-x-auto">

        <div className="min-w-[1450px]">

          {/* =============================================
              CABEÇALHO DAS COLUNAS
          ============================================== */}

          <div className="grid grid-cols-[minmax(380px,1fr)_130px_90px_130px_110px_90px_110px_100px_90px_110px_110px] border-b border-white/[0.05] px-4">

            <ColumnHead>
              Estrutura
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              Investimento
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              Vendas
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              Receita
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              CPA
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              ROAS
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              Impressões
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              Cliques
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              CTR
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              CPC
            </ColumnHead>

            <ColumnHead
              align="right"
            >
              CPM
            </ColumnHead>
          </div>


          {/* =============================================
              CAMPANHAS
          ============================================== */}

          {campaigns.map(
            (
              campaign
            ) => {
              const cKey =
                campaign.campaignId ??
                campaign.externalId ??
                campaign.name


              const campaignAdSets =
                adSetsByCampaign.get(
                  cKey
                ) ??
                []


              const isOpen =
                openCampaigns.has(
                  cKey
                )


              return (
                <div
                  key={
                    cKey
                  }
                  className="border-b border-white/[0.04] last:border-0"
                >

                  {/* CAMPANHA */}

                  <MetricRow
                    depth={
                      0
                    }

                    icon={
                      <Megaphone
                        size={14}
                      />
                    }

                    name={
                      campaign.name
                    }

                    externalId={
                      campaign.externalId
                    }

                    investment={
                      campaign.investment
                    }

                    orders={
                      campaign.attributedOrders
                    }

                    revenue={
                      campaign.attributedRevenue
                    }

                    cpa={
                      campaign.cpa
                    }

                    roas={
                      campaign.roas
                    }

                    impressions={
                      campaign.impressions
                    }

                    clicks={
                      campaign.clicks
                    }

                    ctr={
                      campaign.ctr
                    }

                    cpc={
                      campaign.cpc
                    }

                    cpm={
                      campaign.cpm
                    }

                    currency={
                      currency
                    }

                    expandable={
                      campaignAdSets.length >
                      0
                    }

                    open={
                      isOpen
                    }

                    onToggle={() =>
                      toggleCampaign(
                        cKey
                      )
                    }

                    label="Campanha"
                  />


                  {/* CONJUNTOS */}

                  {isOpen &&
                    campaignAdSets.map(
                      (
                        adSet
                      ) => {
                        const sKey =
                          adSet.entityId ??
                          adSet.externalId ??
                          adSet.name


                        const adSetAds =
                          adsByAdSet.get(
                            sKey
                          ) ??
                          []


                        const adSetOpen =
                          openAdSets.has(
                            sKey
                          )


                        return (
                          <div
                            key={
                              sKey
                            }
                          >

                            <MetricRow
                              depth={
                                1
                              }

                              icon={
                                <PanelsTopLeft
                                  size={14}
                                />
                              }

                              name={
                                adSet.name
                              }

                              externalId={
                                adSet.externalId
                              }

                              investment={
                                adSet.investment
                              }

                              orders={
                                adSet.attributedOrders
                              }

                              revenue={
                                adSet.attributedRevenue
                              }

                              cpa={
                                adSet.cpa
                              }

                              roas={
                                adSet.roas
                              }

                              impressions={
                                adSet.impressions
                              }

                              clicks={
                                adSet.clicks
                              }

                              ctr={
                                adSet.ctr
                              }

                              cpc={
                                adSet.cpc
                              }

                              cpm={
                                adSet.cpm
                              }

                              currency={
                                currency
                              }

                              expandable={
                                adSetAds.length >
                                0
                              }

                              open={
                                adSetOpen
                              }

                              onToggle={() =>
                                toggleAdSet(
                                  sKey
                                )
                              }

                              label="Conjunto"
                            />


                            {/* ANÚNCIOS */}

                            {adSetOpen &&
                              adSetAds.map(
                                (
                                  ad
                                ) => {
                                  const aKey =
                                    ad.entityId ??
                                    ad.externalId ??
                                    ad.name


                                  return (
                                    <MetricRow
                                      key={
                                        aKey
                                      }

                                      depth={
                                        2
                                      }

                                      icon={
                                        <RectangleHorizontal
                                          size={14}
                                        />
                                      }

                                      name={
                                        ad.name
                                      }

                                      externalId={
                                        ad.externalId
                                      }

                                      investment={
                                        ad.investment
                                      }

                                      orders={
                                        ad.attributedOrders
                                      }

                                      revenue={
                                        ad.attributedRevenue
                                      }

                                      cpa={
                                        ad.cpa
                                      }

                                      roas={
                                        ad.roas
                                      }

                                      impressions={
                                        ad.impressions
                                      }

                                      clicks={
                                        ad.clicks
                                      }

                                      ctr={
                                        ad.ctr
                                      }

                                      cpc={
                                        ad.cpc
                                      }

                                      cpm={
                                        ad.cpm
                                      }

                                      currency={
                                        currency
                                      }

                                      expandable={
                                        false
                                      }

                                      open={
                                        false
                                      }

                                      label="Anúncio"
                                    />
                                  )
                                }
                              )}
                          </div>
                        )
                      }
                    )}
                </div>
              )
            }
          )}
        </div>
      </div>


      {/* RODAPÉ */}

      <div className="border-t border-white/[0.05] px-5 py-4 md:px-6">

        <p className="text-[10px] leading-5 text-zinc-700">
          Cada nível apresenta suas próprias métricas. Campanha, conjunto e anúncio não são somados entre si.
        </p>
      </div>
    </section>
  )
}


function Header() {
  return (
    <div className="border-b border-white/[0.05] p-5 md:p-6">

      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
        Estrutura Meta
      </p>

      <h2 className="mt-1 text-sm font-semibold text-zinc-200">
        Campanhas, conjuntos e anúncios
      </h2>

      <p className="mt-1 text-xs text-zinc-600">
        Expanda cada nível para analisar mídia e vendas atribuídas em toda a estrutura.
      </p>
    </div>
  )
}


function ColumnHead({
  children,
  align =
    'left',
}: {
  children:
    React.ReactNode

  align?:
    | 'left'
    | 'right'
}) {
  return (
    <div
      className={`px-3 py-3 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600 ${
        align ===
        'right'
          ? 'text-right'
          : 'text-left'
      }`}
    >
      {children}
    </div>
  )
}


function MetricRow({
  depth,
  icon,
  name,
  externalId,

  investment,
  orders,
  revenue,

  cpa,
  roas,

  impressions,
  clicks,
  ctr,
  cpc,
  cpm,

  currency,

  expandable,
  open,

  onToggle,

  label,
}: {
  depth: number

  icon:
    React.ReactNode

  name: string

  externalId:
    string | null

  investment:
    number

  orders:
    number

  revenue:
    number

  cpa:
    number

  roas:
    number

  impressions:
    number

  clicks:
    number

  ctr:
    number

  cpc:
    number

  cpm:
    number

  currency:
    string

  expandable:
    boolean

  open:
    boolean

  onToggle?: () =>
    void

  label: string
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(380px,1fr)_130px_90px_130px_110px_90px_110px_100px_90px_110px_110px] items-center px-4 transition ${
        depth === 0
          ? 'bg-white/[0.012] hover:bg-white/[0.025]'
          : depth === 1
            ? 'bg-black/10 hover:bg-white/[0.018]'
            : 'hover:bg-white/[0.012]'
      }`}
    >

      {/* ESTRUTURA */}

      <div className="min-w-0 px-3 py-4">

        <div
          className="flex min-w-0 items-center"
          style={{
            paddingLeft:
              `${depth * 28}px`,
          }}
        >

          <button
            type="button"
            onClick={
              expandable
                ? onToggle
                : undefined
            }
            disabled={
              !expandable
            }
            className={`mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              expandable
                ? 'text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200'
                : 'text-zinc-800'
            }`}
          >
            {expandable ? (
              open ? (
                <ChevronDown
                  size={14}
                />
              ) : (
                <ChevronRight
                  size={14}
                />
              )
            ) : (
              <span className="h-3 w-3" />
            )}
          </button>


          <div className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.02] text-zinc-600">
            {icon}
          </div>


          <div className="min-w-0">

            <div className="flex min-w-0 items-center gap-2">

              <p
                className={`truncate text-xs ${
                  depth === 0
                    ? 'font-semibold text-zinc-200'
                    : depth === 1
                      ? 'font-medium text-zinc-400'
                      : 'text-zinc-500'
                }`}
              >
                {name}
              </p>


              <span className="shrink-0 rounded-md border border-white/[0.05] bg-white/[0.02] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.06em] text-zinc-700">
                {label}
              </span>
            </div>


            {externalId && (
              <p className="mt-1 truncate font-mono text-[8px] text-zinc-800">
                {externalId}
              </p>
            )}
          </div>
        </div>
      </div>


      <ValueCell
        strong={
          depth === 0
        }
      >
        {formatMoney(
          investment,
          currency
        )}
      </ValueCell>


      <ValueCell>
        {formatNumber(
          orders
        )}
      </ValueCell>


      <ValueCell
        strong={
          depth === 0
        }
      >
        {formatMoney(
          revenue,
          currency
        )}
      </ValueCell>


      <ValueCell>
        {orders >
        0
          ? formatMoney(
              cpa,
              currency
            )
          : '—'}
      </ValueCell>


      <ValueCell
        strong={
          depth === 0
        }
      >
        {investment >
        0
          ? `${roas.toFixed(
              2
            )}x`
          : '—'}
      </ValueCell>


      <ValueCell>
        {formatNumber(
          impressions
        )}
      </ValueCell>


      <ValueCell>
        {formatNumber(
          clicks
        )}
      </ValueCell>


      <ValueCell>
        {formatPercent(
          ctr
        )}
      </ValueCell>


      <ValueCell>
        {formatMoney(
          cpc,
          currency
        )}
      </ValueCell>


      <ValueCell>
        {formatMoney(
          cpm,
          currency
        )}
      </ValueCell>
    </div>
  )
}


function ValueCell({
  children,
  strong =
    false,
}: {
  children:
    React.ReactNode

  strong?:
    boolean
}) {
  return (
    <div
      className={`whitespace-nowrap px-3 py-4 text-right text-xs ${
        strong
          ? 'font-medium text-zinc-300'
          : 'text-zinc-500'
      }`}
    >
      {children}
    </div>
  )
}