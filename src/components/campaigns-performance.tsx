'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type {
  ReactNode,
} from 'react'

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'


type Level =
  | 'campaign'
  | 'adset'
  | 'ad'


type ViewMode =
  | 'hierarchy'
  | Level


type StatusFilter =
  | 'all'
  | 'active'
  | 'paused'


type SalesFilter =
  | 'all'
  | 'with_sales'
  | 'without_sales'


type SpendFilter =
  | 'all'
  | 'with_spend'
  | 'without_spend'


type SortDirection =
  | 'asc'
  | 'desc'


type SortKey =
  | 'name'
  | 'spend'
  | 'sales'
  | 'revenue'
  | 'cpa'
  | 'roas'
  | 'ctr'
  | 'cpc'
  | 'cpm'
  | 'clicks'
  | 'impressions'
  | 'reach'
  | 'frequency'
  | 'conversionRate'


type PerformanceItem = {
  id: string

  externalId:
    string | null

  name: string

  status:
    string | null

  effectiveStatus:
    string | null

  parent: {
    campaignId:
      string | null

    adSetId:
      string | null
  }

  ads: {
    spend: number
    impressions: number
    reach: number
    clicks: number
    ctr: number
    cpc: number
    cpm: number
  }

  sales: {
    approved: number
    revenue: number
  }

  performance: {
    cpa: number
    roas: number
    conversionRate: number
  }
}


type PerformanceResponse = {
  ok: boolean

  error?: string

  period?: {
    startDate: string
    endDate: string
    timezone: string
  }

  level?: Level

  totals?: {
    ads: {
      spend: number
      impressions: number
      reach: number
      clicks: number
      ctr: number
      cpc: number
      cpm: number
    }

    sales: {
      approved: number
      revenue: number
    }

    performance: {
      cpa: number
      roas: number
      conversionRate: number
    }
  }

  count?: number

  items?: PerformanceItem[]
}


type PerformanceData = {
  campaign:
    PerformanceResponse | null

  adset:
    PerformanceResponse | null

  ad:
    PerformanceResponse | null
}


type Props = {
  projectId: string

  currency: string

  initialStartDate: string
  initialEndDate: string

  campaignsCount: number
  adSetsCount: number
  adsCount: number
}


type HierarchyAdSet = {
  adSet:
    PerformanceItem

  ads:
    PerformanceItem[]
}


type HierarchyCampaign = {
  campaign:
    PerformanceItem

  adSets:
    HierarchyAdSet[]
}


const levelLabels: Record<
  Level,
  string
> = {
  campaign:
    'Campanhas',

  adset:
    'Conjuntos',

  ad:
    'Anúncios',
}


function formatInteger(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      maximumFractionDigits:
        0,
    }
  ).format(
    value
  )
}


function formatDecimal(
  value: number
) {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  ).format(
    value
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


  return {
    year:
      Number(
        match[1]
      ),

    month:
      Number(
        match[2]
      ),

    day:
      Number(
        match[3]
      ),
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
    return dateString
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
  ].join(
    '-'
  )
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


function getEffectiveStatus(
  item: PerformanceItem
) {
  return (
    item.effectiveStatus ??
    item.status ??
    ''
  ).toUpperCase()
}


function getStatusClasses(
  status:
    string | null
) {
  const normalized =
    status?.toUpperCase() ??
    ''


  if (
    normalized ===
    'ACTIVE'
  ) {
    return 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400'
  }


  if (
    normalized ===
      'PAUSED' ||
    normalized.includes(
      'PAUSED'
    )
  ) {
    return 'border-amber-500/20 bg-amber-500/[0.08] text-amber-400'
  }


  return 'border-white/[0.06] bg-white/[0.03] text-zinc-500'
}


function translateStatus(
  status:
    string | null
) {
  switch (
    status?.toUpperCase()
  ) {
    case 'ACTIVE':
      return 'Ativo'

    case 'PAUSED':
      return 'Pausado'

    case 'ARCHIVED':
      return 'Arquivado'

    case 'DELETED':
      return 'Excluído'

    case 'CAMPAIGN_PAUSED':
      return 'Campanha pausada'

    case 'ADSET_PAUSED':
      return 'Conjunto pausado'

    default:
      return (
        status ??
        '—'
      )
  }
}


function getFrequency(
  item: PerformanceItem
) {
  return item.ads.reach >
    0
    ? item.ads.impressions /
        item.ads.reach
    : 0
}


function getSortValue(
  item: PerformanceItem,
  key: SortKey
) {
  switch (
    key
  ) {
    case 'name':
      return item.name
        .toLocaleLowerCase(
          'pt-BR'
        )

    case 'spend':
      return item.ads.spend

    case 'sales':
      return item.sales.approved

    case 'revenue':
      return item.sales.revenue

    case 'cpa':
      return item.performance.cpa

    case 'roas':
      return item.performance.roas

    case 'ctr':
      return item.ads.ctr

    case 'cpc':
      return item.ads.cpc

    case 'cpm':
      return item.ads.cpm

    case 'clicks':
      return item.ads.clicks

    case 'impressions':
      return item.ads.impressions

    case 'reach':
      return item.ads.reach

    case 'frequency':
      return getFrequency(
        item
      )

    case 'conversionRate':
      return item.performance
        .conversionRate
  }
}


function sortPerformanceItems(
  items: PerformanceItem[],
  key: SortKey,
  direction: SortDirection
) {
  return [
    ...items,
  ].sort(
    (
      a,
      b
    ) => {
      const aValue =
        getSortValue(
          a,
          key
        )

      const bValue =
        getSortValue(
          b,
          key
        )


      let comparison =
        0


      if (
        typeof aValue ===
          'string' &&
        typeof bValue ===
          'string'
      ) {
        comparison =
          aValue.localeCompare(
            bValue,
            'pt-BR'
          )
      } else {
        comparison =
          Number(
            aValue
          ) -
          Number(
            bValue
          )
      }


      return direction ===
        'asc'
        ? comparison
        : comparison * -1
    }
  )
}


export default function CampaignsPerformance({
  projectId,
  currency,
  initialStartDate,
  initialEndDate,
  campaignsCount,
  adSetsCount,
  adsCount,
}: Props) {
  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      'hierarchy'
    )


  const [
    startDate,
    setStartDate,
  ] =
    useState(
      initialStartDate
    )


  const [
    endDate,
    setEndDate,
  ] =
    useState(
      initialEndDate
    )


  const [
    search,
    setSearch,
  ] =
    useState('')


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      'all'
    )


  const [
    salesFilter,
    setSalesFilter,
  ] =
    useState<SalesFilter>(
      'all'
    )


  const [
    spendFilter,
    setSpendFilter,
  ] =
    useState<SpendFilter>(
      'all'
    )


  const [
    sortKey,
    setSortKey,
  ] =
    useState<SortKey>(
      'spend'
    )


  const [
    sortDirection,
    setSortDirection,
  ] =
    useState<SortDirection>(
      'desc'
    )


  const [
    data,
    setData,
  ] =
    useState<PerformanceData>({
      campaign:
        null,

      adset:
        null,

      ad:
        null,
    })


  const [
    expandedCampaigns,
    setExpandedCampaigns,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    )


  const [
    expandedAdSets,
    setExpandedAdSets,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    )


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)


  /*
   * =====================================================
   * FORMATADOR
   * =====================================================
   */

  const moneyFormatter =
    useMemo(
      () =>
        new Intl.NumberFormat(
          'pt-BR',
          {
            style:
              'currency',

            currency:
              currency ||
              'BRL',

            minimumFractionDigits:
              2,
          }
        ),
      [
        currency,
      ]
    )


  function formatMoney(
    value: number
  ) {
    return moneyFormatter.format(
      value
    )
  }


  /*
   * =====================================================
   * FETCH
   * =====================================================
   */

  const loadPerformance =
    useCallback(
      async (
        silent = false
      ) => {
        if (
          !startDate ||
          !endDate
        ) {
          return
        }


        if (
          !silent
        ) {
          setLoading(
            true
          )
        } else {
          setRefreshing(
            true
          )
        }


        setError(
          null
        )


        try {
          const levels:
            Level[] = [
              'campaign',
              'adset',
              'ad',
            ]


          const responses =
            await Promise.all(
              levels.map(
                async (
                  level
                ) => {
                  const params =
                    new URLSearchParams({
                      projectId,
                      startDate,
                      endDate,
                      level,
                    })


                  const response =
                    await fetch(
                      `/api/attribution/performance?${params.toString()}`,
                      {
                        cache:
                          'no-store',
                      }
                    )


                  const result:
                    PerformanceResponse =
                    await response.json()


                  if (
                    !response.ok ||
                    !result.ok
                  ) {
                    throw new Error(
                      result.error ??
                        `Não foi possível carregar ${levelLabels[
                          level
                        ].toLowerCase()}.`
                    )
                  }


                  return {
                    level,
                    result,
                  }
                }
              )
            )


          const nextData:
            PerformanceData = {
              campaign:
                null,

              adset:
                null,

              ad:
                null,
            }


          for (
            const response
            of responses
          ) {
            nextData[
              response.level
            ] =
              response.result
          }


          setData(
            nextData
          )
        } catch (
          error
        ) {
          setError(
            error instanceof Error
              ? error.message
              : 'Erro inesperado.'
          )
        } finally {
          setLoading(
            false
          )

          setRefreshing(
            false
          )
        }
      },
      [
        projectId,
        startDate,
        endDate,
      ]
    )


  useEffect(() => deferEffect(() => {
    void loadPerformance()
  }), [
    loadPerformance,
  ])


  /*
   * Atualização silenciosa
   * a cada 30 segundos.
   */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void loadPerformance(
              true
            )
          }
        },
        30000
      )


    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [
    loadPerformance,
  ])


  /*
   * =====================================================
   * DADOS BASE
   * =====================================================
   */

  const campaigns = useMemo(() => data.campaign?.items ?? [], [data.campaign?.items])


  const adSets = useMemo(() => data.adset?.items ?? [], [data.adset?.items])


  const ads = useMemo(() => data.ad?.items ?? [], [data.ad?.items])


  const totals =
    data.campaign?.totals


  const totalFrequency =
    (
      totals?.ads.reach ??
      0
    ) >
    0
      ? (
          totals?.ads.impressions ??
          0
        ) /
        (
          totals?.ads.reach ??
          1
        )
      : 0


  /*
   * =====================================================
   * PERÍODOS RÁPIDOS
   * =====================================================
   */

  const projectTimezone =
    data.campaign
      ?.period
      ?.timezone ??
    'America/Fortaleza'


  const projectToday =
    formatDateInTimezone(
      new Date(),
      projectTimezone
    )


  function applyToday() {
    setStartDate(
      projectToday
    )

    setEndDate(
      projectToday
    )
  }


  function applyYesterday() {
    const yesterday =
      addDays(
        projectToday,
        -1
      )


    setStartDate(
      yesterday
    )

    setEndDate(
      yesterday
    )
  }


  function applyLastDays(
    days: number
  ) {
    setStartDate(
      addDays(
        projectToday,
        -(days - 1)
      )
    )

    setEndDate(
      projectToday
    )
  }


  function isPeriod(
    expectedStart: string,
    expectedEnd: string
  ) {
    return (
      startDate ===
        expectedStart &&
      endDate ===
        expectedEnd
    )
  }


  /*
   * =====================================================
   * FILTROS
   * =====================================================
   */

  const searchTerm =
    search
      .trim()
      .toLowerCase()


  const matchesSearch =
    useCallback(
      (
        item:
          PerformanceItem
      ) => {
        if (
          !searchTerm
        ) {
          return true
        }


        return (
          item.name
            .toLowerCase()
            .includes(
              searchTerm
            ) ||
          item.externalId
            ?.toLowerCase()
            .includes(
              searchTerm
            ) ===
            true
        )
      },
      [
        searchTerm,
      ]
    )


  const matchesStatus =
    useCallback(
      (
        item:
          PerformanceItem
      ) => {
        if (
          statusFilter ===
          'all'
        ) {
          return true
        }


        const status =
          getEffectiveStatus(
            item
          )


        if (
          statusFilter ===
          'active'
        ) {
          return (
            status ===
            'ACTIVE'
          )
        }


        return status.includes(
          'PAUSED'
        )
      },
      [
        statusFilter,
      ]
    )


  const matchesSales =
    useCallback(
      (
        item:
          PerformanceItem
      ) => {
        if (
          salesFilter ===
          'all'
        ) {
          return true
        }


        if (
          salesFilter ===
          'with_sales'
        ) {
          return (
            item.sales.approved >
            0
          )
        }


        return (
          item.sales.approved ===
          0
        )
      },
      [
        salesFilter,
      ]
    )


  const matchesSpend =
    useCallback(
      (
        item:
          PerformanceItem
      ) => {
        if (
          spendFilter ===
          'all'
        ) {
          return true
        }


        if (
          spendFilter ===
          'with_spend'
        ) {
          return (
            item.ads.spend >
            0
          )
        }


        return (
          item.ads.spend ===
          0
        )
      },
      [
        spendFilter,
      ]
    )


  const matchesNonSearchFilters =
    useCallback(
      (
        item:
          PerformanceItem
      ) =>
        matchesStatus(
          item
        ) &&
        matchesSales(
          item
        ) &&
        matchesSpend(
          item
        ),
      [
        matchesStatus,
        matchesSales,
        matchesSpend,
      ]
    )


  const matchesFilters =
    useCallback(
      (
        item:
          PerformanceItem
      ) =>
        matchesSearch(
          item
        ) &&
        matchesNonSearchFilters(
          item
        ),
      [
        matchesSearch,
        matchesNonSearchFilters,
      ]
    )


  /*
   * =====================================================
   * HIERARQUIA
   * =====================================================
   */

  const hierarchy =
    useMemo<
      HierarchyCampaign[]
    >(
      () => {
        const campaignNodes =
          campaigns
            .map(
              (
                campaign
              ) => {
                const campaignSearchMatch =
                  matchesSearch(
                    campaign
                  )


                const campaignFilterMatch =
                  matchesNonSearchFilters(
                    campaign
                  )


                const campaignAdSets =
                  adSets.filter(
                    (
                      adSet
                    ) =>
                      adSet.parent
                        .campaignId ===
                      campaign.id
                  )


                const adSetNodes =
                  campaignAdSets
                    .map(
                      (
                        adSet
                      ) => {
                        const adSetSearchMatch =
                          matchesSearch(
                            adSet
                          )


                        const adSetFilterMatch =
                          matchesNonSearchFilters(
                            adSet
                          )


                        const sourceAds =
                          ads.filter(
                            (
                              ad
                            ) =>
                              ad.parent
                                .adSetId ===
                              adSet.id
                          )


                        let filteredAds =
                          sourceAds.filter(
                            matchesFilters
                          )


                        /*
                         * Se a busca bateu no conjunto,
                         * mostramos seus anúncios que
                         * respeitam os demais filtros.
                         */

                        if (
                          searchTerm &&
                          adSetSearchMatch
                        ) {
                          filteredAds =
                            sourceAds.filter(
                              matchesNonSearchFilters
                            )
                        }


                        /*
                         * Se a busca bateu diretamente
                         * na campanha, preservamos os
                         * descendentes compatíveis com
                         * os demais filtros.
                         */

                        if (
                          searchTerm &&
                          campaignSearchMatch
                        ) {
                          filteredAds =
                            sourceAds.filter(
                              matchesNonSearchFilters
                            )
                        }


                        const shouldIncludeAdSet =
                          (
                            adSetFilterMatch &&
                            (
                              !searchTerm ||
                              adSetSearchMatch ||
                              campaignSearchMatch
                            )
                          ) ||
                          filteredAds.length >
                            0


                        if (
                          !shouldIncludeAdSet
                        ) {
                          return null
                        }


                        return {
                          adSet,

                          ads:
                            sortPerformanceItems(
                              filteredAds,
                              sortKey,
                              sortDirection
                            ),
                        }
                      }
                    )
                    .filter(
                      (
                        node
                      ): node is HierarchyAdSet =>
                        node !==
                        null
                    )


                const shouldIncludeCampaign =
                  (
                    campaignFilterMatch &&
                    (
                      !searchTerm ||
                      campaignSearchMatch
                    )
                  ) ||
                  adSetNodes.length >
                    0


                if (
                  !shouldIncludeCampaign
                ) {
                  return null
                }


                return {
                  campaign,

                  adSets:
                    adSetNodes.sort(
                      (
                        a,
                        b
                      ) => {
                        const sorted =
                          sortPerformanceItems(
                            [
                              a.adSet,
                              b.adSet,
                            ],
                            sortKey,
                            sortDirection
                          )


                        return sorted[0]
                          .id ===
                          a.adSet.id
                          ? -1
                          : 1
                      }
                    ),
                }
              }
            )
            .filter(
              (
                node
              ): node is HierarchyCampaign =>
                node !==
                null
            )


        return campaignNodes.sort(
          (
            a,
            b
          ) => {
            const sorted =
              sortPerformanceItems(
                [
                  a.campaign,
                  b.campaign,
                ],
                sortKey,
                sortDirection
              )


            return sorted[0]
              .id ===
              a.campaign.id
              ? -1
              : 1
          }
        )
      },
      [
        campaigns,
        adSets,
        ads,
        matchesSearch,
        matchesFilters,
        matchesNonSearchFilters,
        searchTerm,
        sortKey,
        sortDirection,
      ]
    )


  /*
   * =====================================================
   * VISUALIZAÇÃO PLANA
   * =====================================================
   */

  const flatItems =
    useMemo(
      () => {
        if (
          viewMode ===
          'hierarchy'
        ) {
          return []
        }


        const source =
          viewMode ===
          'campaign'
            ? campaigns
            : viewMode ===
                'adset'
              ? adSets
              : ads


        return sortPerformanceItems(
          source.filter(
            matchesFilters
          ),
          sortKey,
          sortDirection
        )
      },
      [
        viewMode,
        campaigns,
        adSets,
        ads,
        matchesFilters,
        sortKey,
        sortDirection,
      ]
    )


  /*
   * =====================================================
   * EXPANSÃO
   * =====================================================
   */

  function toggleCampaign(
    campaignId: string
  ) {
    setExpandedCampaigns(
      (
        current
      ) => {
        const next =
          new Set(
            current
          )


        if (
          next.has(
            campaignId
          )
        ) {
          next.delete(
            campaignId
          )
        } else {
          next.add(
            campaignId
          )
        }


        return next
      }
    )
  }


  function toggleAdSet(
    adSetId: string
  ) {
    setExpandedAdSets(
      (
        current
      ) => {
        const next =
          new Set(
            current
          )


        if (
          next.has(
            adSetId
          )
        ) {
          next.delete(
            adSetId
          )
        } else {
          next.add(
            adSetId
          )
        }


        return next
      }
    )
  }


  /*
   * =====================================================
   * ORDENAÇÃO
   * =====================================================
   */

  function handleSort(
    key: SortKey
  ) {
    if (
      sortKey ===
      key
    ) {
      setSortDirection(
        (
          current
        ) =>
          current ===
          'desc'
            ? 'asc'
            : 'desc'
      )

      return
    }


    setSortKey(
      key
    )


    setSortDirection(
      key ===
      'name'
        ? 'asc'
        : 'desc'
    )
  }


  /*
   * =====================================================
   * RESET
   * =====================================================
   */

  const filtersActive =
    Boolean(
      searchTerm
    ) ||
    statusFilter !==
      'all' ||
    salesFilter !==
      'all' ||
    spendFilter !==
      'all'


  function clearFilters() {
    setSearch(
      ''
    )

    setStatusFilter(
      'all'
    )

    setSalesFilter(
      'all'
    )

    setSpendFilter(
      'all'
    )
  }


  /*
   * =====================================================
   * CONTADORES
   * =====================================================
   */

  const levelCounts:
    Record<
      Level,
      number
    > = {
    campaign:
      campaignsCount,

    adset:
      adSetsCount,

    ad:
      adsCount,
  }


  const visibleCount =
    viewMode ===
    'hierarchy'
      ? hierarchy.length
      : flatItems.length


  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-600">
              Performance
            </p>


            <h2 className="mt-1 text-lg font-semibold text-zinc-200">
              Desempenho da mídia
            </h2>


            <p className="mt-1 text-xs text-zinc-600">
              Meta Ads + vendas pagas atribuídas pelo Traffic Flow.
            </p>

          </div>


          {/* PERÍODO */}

          <div className="flex flex-wrap items-end gap-3">

            <label className="block">

              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                Início
              </span>


              <input
                type="date"
                value={
                  startDate
                }
                onChange={(
                  event
                ) =>
                  setStartDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-zinc-300 outline-none transition focus:border-emerald-500/30"
              />

            </label>


            <label className="block">

              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                Fim
              </span>


              <input
                type="date"
                value={
                  endDate
                }
                onChange={(
                  event
                ) =>
                  setEndDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-zinc-300 outline-none transition focus:border-emerald-500/30"
              />

            </label>


            <button
              type="button"
              onClick={() =>
                loadPerformance(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-200 disabled:opacity-40"
              title="Atualizar"
            >

              <RefreshCw
                size={
                  15
                }
                className={
                  refreshing
                    ? 'animate-spin'
                    : ''
                }
              />

            </button>

          </div>

        </div>


        {/* PERÍODOS RÁPIDOS */}

        <div className="mt-5 flex flex-wrap gap-2">

          <PeriodButton
            active={
              isPeriod(
                projectToday,
                projectToday
              )
            }
            onClick={
              applyToday
            }
          >
            Hoje
          </PeriodButton>


          <PeriodButton
            active={
              isPeriod(
                addDays(
                  projectToday,
                  -1
                ),
                addDays(
                  projectToday,
                  -1
                )
              )
            }
            onClick={
              applyYesterday
            }
          >
            Ontem
          </PeriodButton>


          {[
            7,
            14,
            30,
          ].map(
            (
              days
            ) => (
              <PeriodButton
                key={
                  days
                }
                active={
                  isPeriod(
                    addDays(
                      projectToday,
                      -(days - 1)
                    ),
                    projectToday
                  )
                }
                onClick={() =>
                  applyLastDays(
                    days
                  )
                }
              >
                {days} dias
              </PeriodButton>
            )
          )}

        </div>


        {/* MODOS */}

        <div className="mt-5 flex flex-wrap gap-2">

          <ViewButton
            active={
              viewMode ===
              'hierarchy'
            }
            onClick={() =>
              setViewMode(
                'hierarchy'
              )
            }
            label="Hierarquia"
            detail={`${campaignsCount} → ${adSetsCount} → ${adsCount}`}
          />


          {(
            [
              'campaign',
              'adset',
              'ad',
            ] as Level[]
          ).map(
            (
              level
            ) => (
              <ViewButton
                key={
                  level
                }
                active={
                  viewMode ===
                  level
                }
                onClick={() =>
                  setViewMode(
                    level
                  )
                }
                label={
                  levelLabels[
                    level
                  ]
                }
                detail={
                  String(
                    levelCounts[
                      level
                    ]
                  )
                }
              />
            )
          )}

        </div>

      </div>


      {/* ERRO */}

      {error && (
        <div className="m-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400 md:m-6">
          {error}
        </div>
      )}


      {/* LOADING */}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center">

          <div className="flex items-center gap-2 text-sm text-zinc-600">

            <RefreshCw
              size={
                15
              }
              className="animate-spin"
            />

            Carregando estrutura da Meta...

          </div>

        </div>
      ) : (
        <>

          {/* ===============================================
              RESUMO
          =============================================== */}

          <div className="grid gap-px border-b border-white/[0.05] bg-white/[0.05] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">

            <SummaryMetric
              title="Investimento"
              value={
                formatMoney(
                  totals?.ads.spend ??
                  0
                )
              }
            />


            <SummaryMetric
              title="Receita"
              value={
                formatMoney(
                  totals?.sales.revenue ??
                  0
                )
              }
              subtitle="Atribuída à Meta"
            />


            <SummaryMetric
              title="Vendas"
              value={
                formatInteger(
                  totals?.sales.approved ??
                  0
                )
              }
              subtitle="Atribuídas"
            />


            <SummaryMetric
              title="CPA"
              value={
                (
                  totals?.sales.approved ??
                  0
                ) >
                0
                  ? formatMoney(
                      totals?.performance.cpa ??
                      0
                    )
                  : '—'
              }
            />


            <SummaryMetric
              title="ROAS"
              value={
                (
                  totals?.ads.spend ??
                  0
                ) >
                0
                  ? `${formatDecimal(
                      totals?.performance.roas ??
                      0
                    )}x`
                  : '—'
              }
            />


            <SummaryMetric
              title="CTR"
              value={`${formatDecimal(
                totals?.ads.ctr ??
                0
              )}%`}
            />


            <SummaryMetric
              title="Frequência"
              value={
                (
                  totals?.ads.reach ??
                  0
                ) >
                0
                  ? `${formatDecimal(
                      totalFrequency
                    )}x`
                  : '—'
              }
            />


            <SummaryMetric
              title="Conversão"
              value={
                (
                  totals?.ads.clicks ??
                  0
                ) >
                0
                  ? `${formatDecimal(
                      totals?.performance
                        .conversionRate ??
                      0
                    )}%`
                  : '—'
              }
              subtitle="Clique → venda"
            />

          </div>


          {/* ===============================================
              FILTROS
          =============================================== */}

          <div className="border-b border-white/[0.05] p-5 md:p-6">

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex flex-1 flex-col gap-3 md:flex-row md:flex-wrap">

                <div className="relative w-full max-w-sm">

                  <Search
                    size={
                      14
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                  />


                  <input
                    value={
                      search
                    }
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Buscar campanha, conjunto ou anúncio..."
                    className="w-full rounded-xl border border-white/[0.06] bg-black/20 py-2.5 pl-9 pr-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-emerald-500/30"
                  />

                </div>


                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value as StatusFilter
                    )
                  }
                  className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-xs text-zinc-400 outline-none focus:border-emerald-500/30"
                >

                  <option value="all">
                    Todos os status
                  </option>

                  <option value="active">
                    Ativos
                  </option>

                  <option value="paused">
                    Pausados
                  </option>

                </select>


                <select
                  value={
                    salesFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setSalesFilter(
                      event.target
                        .value as SalesFilter
                    )
                  }
                  className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-xs text-zinc-400 outline-none focus:border-emerald-500/30"
                >

                  <option value="all">
                    Todas as vendas
                  </option>

                  <option value="with_sales">
                    Com venda
                  </option>

                  <option value="without_sales">
                    Sem venda
                  </option>

                </select>


                <select
                  value={
                    spendFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setSpendFilter(
                      event.target
                        .value as SpendFilter
                    )
                  }
                  className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-xs text-zinc-400 outline-none focus:border-emerald-500/30"
                >

                  <option value="all">
                    Todo investimento
                  </option>

                  <option value="with_spend">
                    Com investimento
                  </option>

                  <option value="without_spend">
                    Sem investimento
                  </option>

                </select>


                {filtersActive && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] px-3 py-2.5 text-xs text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-300"
                  >

                    <RotateCcw
                      size={
                        13
                      }
                    />

                    Limpar filtros

                  </button>
                )}

              </div>


              <p className="shrink-0 text-xs text-zinc-600">

                {visibleCount}{' '}

                {viewMode ===
                'hierarchy'
                  ? visibleCount ===
                    1
                    ? 'campanha visível'
                    : 'campanhas visíveis'
                  : visibleCount ===
                      1
                    ? 'resultado'
                    : 'resultados'}

              </p>

            </div>

          </div>


          {/* ===============================================
              TABELA
          =============================================== */}

          {visibleCount ===
          0 ? (
            <div className="flex min-h-[280px] items-center justify-center p-6">

              <div className="text-center">

                <p className="text-sm text-zinc-400">
                  Nenhum dado encontrado.
                </p>


                <p className="mt-1 text-xs text-zinc-600">
                  Altere o período, a busca ou os filtros.
                </p>

              </div>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1850px] border-collapse">

                <thead>

                  <tr className="border-b border-white/[0.05]">

                    <SortableTableHead
                      className="sticky left-0 z-20 min-w-[390px] bg-[#0d0f13]"
                      sortKey="name"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Estrutura
                    </SortableTableHead>


                    <TableHead>
                      Status
                    </TableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="spend"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Investimento
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="sales"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Vendas
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="revenue"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Receita
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="cpa"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      CPA
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="roas"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      ROAS
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="ctr"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      CTR
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="cpc"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      CPC
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="cpm"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      CPM
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="clicks"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Cliques
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="impressions"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Impressões
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="reach"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Alcance
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="frequency"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Frequência
                    </SortableTableHead>


                    <SortableTableHead
                      align="right"
                      sortKey="conversionRate"
                      activeKey={
                        sortKey
                      }
                      direction={
                        sortDirection
                      }
                      onSort={
                        handleSort
                      }
                    >
                      Conversão
                    </SortableTableHead>

                  </tr>

                </thead>


                <tbody>

                  {viewMode ===
                  'hierarchy'
                    ? hierarchy.map(
                        (
                          campaignNode
                        ) => {
                          const campaignOpen =
                            filtersActive ||
                            expandedCampaigns.has(
                              campaignNode
                                .campaign.id
                            )


                          return (
                            <Fragment
                              key={
                                campaignNode
                                  .campaign.id
                              }
                            >

                              <PerformanceRow
                                item={
                                  campaignNode
                                    .campaign
                                }
                                level="campaign"
                                depth={
                                  0
                                }
                                expandable={
                                  campaignNode
                                    .adSets.length >
                                  0
                                }
                                expanded={
                                  campaignOpen
                                }
                                onToggle={() =>
                                  toggleCampaign(
                                    campaignNode
                                      .campaign.id
                                  )
                                }
                                formatMoney={
                                  formatMoney
                                }
                              />


                              {campaignOpen &&
                                campaignNode.adSets.map(
                                  (
                                    adSetNode
                                  ) => {
                                    const adSetOpen =
                                      filtersActive ||
                                      expandedAdSets.has(
                                        adSetNode
                                          .adSet.id
                                      )


                                    return (
                                      <Fragment
                                        key={
                                          adSetNode
                                            .adSet.id
                                        }
                                      >

                                        <PerformanceRow
                                          item={
                                            adSetNode
                                              .adSet
                                          }
                                          level="adset"
                                          depth={
                                            1
                                          }
                                          expandable={
                                            adSetNode
                                              .ads.length >
                                            0
                                          }
                                          expanded={
                                            adSetOpen
                                          }
                                          onToggle={() =>
                                            toggleAdSet(
                                              adSetNode
                                                .adSet.id
                                            )
                                          }
                                          formatMoney={
                                            formatMoney
                                          }
                                        />


                                        {adSetOpen &&
                                          adSetNode.ads.map(
                                            (
                                              ad
                                            ) => (
                                              <PerformanceRow
                                                key={
                                                  ad.id
                                                }
                                                item={
                                                  ad
                                                }
                                                level="ad"
                                                depth={
                                                  2
                                                }
                                                expandable={
                                                  false
                                                }
                                                expanded={
                                                  false
                                                }
                                                formatMoney={
                                                  formatMoney
                                                }
                                              />
                                            )
                                          )}

                                      </Fragment>
                                    )
                                  }
                                )}

                            </Fragment>
                          )
                        }
                      )
                    : flatItems.map(
                        (
                          item
                        ) => (
                          <PerformanceRow
                            key={
                              item.id
                            }
                            item={
                              item
                            }
                            level={
                              viewMode
                            }
                            depth={
                              0
                            }
                            expandable={
                              false
                            }
                            expanded={
                              false
                            }
                            formatMoney={
                              formatMoney
                            }
                          />
                        )
                      )}

                </tbody>

              </table>

            </div>
          )}


          {/* RODAPÉ */}

          <div className="border-t border-white/[0.05] px-5 py-4 text-[10px] text-zinc-700 md:px-6">

            Investimento e métricas de mídia vêm da Meta. Vendas e receita representam pedidos pagos atribuídos pelo Traffic Flow.

          </div>

        </>
      )}

    </section>
  )
}


function PeriodButton({
  active,
  onClick,
  children,
}: {
  active: boolean

  onClick:
    () => void

  children:
    ReactNode
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={
        active
          ? 'rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[11px] font-medium text-emerald-400'
          : 'rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-[11px] text-zinc-500 transition hover:text-zinc-300'
      }
    >
      {children}
    </button>
  )
}


function ViewButton({
  active,
  onClick,
  label,
  detail,
}: {
  active: boolean

  onClick:
    () => void

  label: string

  detail: string
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={
        active
          ? 'rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-2 text-xs font-medium text-emerald-400'
          : 'rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2 text-xs font-medium text-zinc-500 transition hover:text-zinc-300'
      }
    >

      {label}


      <span className="ml-2 text-[10px] opacity-60">
        {detail}
      </span>

    </button>
  )
}


function PerformanceRow({
  item,
  level,
  depth,
  expandable,
  expanded,
  onToggle,
  formatMoney,
}: {
  item:
    PerformanceItem

  level:
    Level

  depth:
    number

  expandable:
    boolean

  expanded:
    boolean

  onToggle?:
    () => void

  formatMoney:
    (
      value: number
    ) => string
}) {
  const levelLabel =
    level ===
    'campaign'
      ? 'Campanha'
      : level ===
          'adset'
        ? 'Conjunto'
        : 'Anúncio'


  const rowClass =
    level ===
    'campaign'
      ? 'bg-white/[0.012]'
      : level ===
          'adset'
        ? 'bg-black/[0.08]'
        : ''


  const stickyBackground =
    level ===
    'campaign'
      ? 'bg-[#101216]'
      : level ===
          'adset'
        ? 'bg-[#0b0d10]'
        : 'bg-[#0d0f13]'


  const frequency =
    getFrequency(
      item
    )


  return (
    <tr
      className={`border-b border-white/[0.035] transition hover:bg-white/[0.02] ${rowClass}`}
    >

      <td
        className={`sticky left-0 z-10 py-4 pr-5 ${stickyBackground}`}
        style={{
          paddingLeft:
            `${20 + depth * 28}px`,
        }}
      >

        <div className="flex min-w-0 items-start gap-2">

          <div className="flex h-5 w-5 shrink-0 items-center justify-center">

            {expandable ? (
              <button
                type="button"
                onClick={
                  onToggle
                }
                className="flex h-5 w-5 items-center justify-center rounded text-zinc-600 transition hover:bg-white/[0.04] hover:text-zinc-300"
                aria-label={
                  expanded
                    ? 'Recolher'
                    : 'Expandir'
                }
              >

                {expanded ? (
                  <ChevronDown
                    size={
                      14
                    }
                  />
                ) : (
                  <ChevronRight
                    size={
                      14
                    }
                  />
                )}

              </button>
            ) : (
              <span className="h-5 w-5" />
            )}

          </div>


          <div className="min-w-0">

            <div className="flex min-w-0 items-center gap-2">

              <p
                className={`truncate text-xs ${
                  level ===
                  'campaign'
                    ? 'font-semibold text-zinc-200'
                    : level ===
                        'adset'
                      ? 'font-medium text-zinc-300'
                      : 'font-medium text-zinc-400'
                }`}
                title={
                  item.name
                }
              >
                {item.name}
              </p>


              <span className="shrink-0 rounded-md border border-white/[0.05] bg-white/[0.02] px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-zinc-700">
                {levelLabel}
              </span>

            </div>


            {item.externalId && (
              <p className="mt-1 truncate text-[9px] text-zinc-700">
                ID {item.externalId}
              </p>
            )}

          </div>

        </div>

      </td>


      <td className="px-3 py-4">

        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${getStatusClasses(
            item.effectiveStatus ??
            item.status
          )}`}
        >

          {translateStatus(
            item.effectiveStatus ??
            item.status
          )}

        </span>

      </td>


      <TableValue>
        {formatMoney(
          item.ads.spend
        )}
      </TableValue>


      <TableValue>
        {formatInteger(
          item.sales.approved
        )}
      </TableValue>


      <TableValue
        strong={
          item.sales.revenue >
          0
        }
      >
        {formatMoney(
          item.sales.revenue
        )}
      </TableValue>


      <TableValue>
        {item.sales.approved >
        0
          ? formatMoney(
              item.performance.cpa
            )
          : '—'}
      </TableValue>


      <TableValue
        strong={
          item.performance.roas >
          0
        }
      >
        {item.ads.spend >
        0
          ? `${formatDecimal(
              item.performance.roas
            )}x`
          : '—'}
      </TableValue>


      <TableValue>
        {formatDecimal(
          item.ads.ctr
        )}
        %
      </TableValue>


      <TableValue>
        {item.ads.clicks >
        0
          ? formatMoney(
              item.ads.cpc
            )
          : '—'}
      </TableValue>


      <TableValue>
        {item.ads.impressions >
        0
          ? formatMoney(
              item.ads.cpm
            )
          : '—'}
      </TableValue>


      <TableValue>
        {formatInteger(
          item.ads.clicks
        )}
      </TableValue>


      <TableValue>
        {formatInteger(
          item.ads.impressions
        )}
      </TableValue>


      <TableValue>
        {formatInteger(
          item.ads.reach
        )}
      </TableValue>


      <TableValue>
        {item.ads.reach >
        0
          ? `${formatDecimal(
              frequency
            )}x`
          : '—'}
      </TableValue>


      <TableValue>
        {item.ads.clicks >
        0
          ? `${formatDecimal(
              item.performance
                .conversionRate
            )}%`
          : '—'}
      </TableValue>

    </tr>
  )
}


function SummaryMetric({
  title,
  value,
  subtitle,
}: {
  title: string

  value: string

  subtitle?: string
}) {
  return (
    <div className="bg-[#0d0f13] px-5 py-5 md:px-6">

      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
        {title}
      </p>


      <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">
        {value}
      </p>


      {subtitle && (
        <p className="mt-1 text-[10px] text-zinc-700">
          {subtitle}
        </p>
      )}

    </div>
  )
}


function SortableTableHead({
  children,
  align =
    'left',
  className =
    '',
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  children:
    ReactNode

  align?:
    | 'left'
    | 'right'

  className?:
    string

  sortKey:
    SortKey

  activeKey:
    SortKey

  direction:
    SortDirection

  onSort:
    (
      key: SortKey
    ) => void
}) {
  const active =
    sortKey ===
    activeKey


  return (
    <th
      className={`px-3 py-3 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600 ${
        align ===
        'right'
          ? 'text-right'
          : 'text-left'
      } ${className}`}
    >

      <button
        type="button"
        onClick={() =>
          onSort(
            sortKey
          )
        }
        className={`inline-flex items-center gap-1.5 transition hover:text-zinc-300 ${
          align ===
          'right'
            ? 'justify-end'
            : 'justify-start'
        }`}
      >

        {children}


        {active ? (
          direction ===
          'desc' ? (
            <ArrowDown
              size={
                11
              }
            />
          ) : (
            <ArrowUp
              size={
                11
              }
            />
          )
        ) : (
          <ArrowUpDown
            size={
              10
            }
            className="opacity-40"
          />
        )}

      </button>

    </th>
  )
}


function TableHead({
  children,
  align =
    'left',
  className =
    '',
}: {
  children:
    ReactNode

  align?:
    | 'left'
    | 'right'

  className?:
    string
}) {
  return (
    <th
      className={`px-3 py-3 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600 ${
        align ===
        'right'
          ? 'text-right'
          : 'text-left'
      } ${className}`}
    >

      {children}

    </th>
  )
}


function TableValue({
  children,
  strong =
    false,
}: {
  children:
    ReactNode

  strong?:
    boolean
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-4 text-right text-xs ${
        strong
          ? 'font-medium text-zinc-200'
          : 'text-zinc-500'
      }`}
    >

      {children}

    </td>
  )
}