'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'

import SalesOrderDrawer from '@/components/sales-order-drawer'
import SalesAnalysis from '@/components/sales-analysis'


type SalesSortKey =
  | 'date'
  | 'value'
  | 'customer'
  | 'status'


type SortDirection =
  | 'asc'
  | 'desc'


type SalesItem = {
  order_id: string

  provider: string

  external_order_id:
    string | null

  external_transaction_id:
    string | null

  transaction_identifier:
    string | null

  order_status: string

  currency:
    string | null

  gross_amount:
    number |
    string |
    null

  payment_method:
    string | null

  installments:
    number | null

  offer_code:
    string | null

  customer_name:
    string | null

  customer_email:
    string | null

  customer_country:
    string | null

  customer_state:
    string | null

  customer_city:
    string | null

  is_attributed:
    boolean

  attribution_status:
    string

  attribution_method:
    string | null

  utm_source:
    string | null

  utm_medium:
    string | null

  utm_campaign:
    string | null

  utm_content:
    string | null

  campaign_name:
    string | null

  ad_set_name:
    string | null

  ad_name:
    string | null

  meta_placement:
    string | null

  meta_site_source:
    string | null

  provider_created_at:
    string | null

  order_created_at:
    string

  paid_at:
    string | null
}


type SalesResponse = {
  ok: boolean

  error?: string

  currency?: string

  summary?: {
    totalOrders: number
    approved: number
    pending: number
    refunded: number
    chargebacks: number
    canceled: number
    disputed: number

    attributed: number
    tokenPending: number
    approvedAttributed: number

    approvedRevenue: number
    attributedRevenue: number

    approvalRate: number
    attributionRate: number
    averageTicket: number
  }

  filterOptions?: {
    paymentMethods:
      string[]

    campaigns:
      string[]

    offers:
      string[]
  }

  analysis?: {
    paymentMethods: {
      key: string
      orders: number
      approved: number
      revenue: number
    }[]

    providers: {
      key: string
      orders: number
      approved: number
      revenue: number
    }[]

    statuses: {
      key: string
      orders: number
      grossValue: number
    }[]

    campaigns: {
      name: string

      externalId:
        string | null

      orders: number
      approved: number
      revenue: number
    }[]

    attribution: {
      key: string
      orders: number
      approved: number
      revenue: number
    }[]
  }

  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }

  items?:
    SalesItem[]
}


type Props = {
  projectId: string

  currency: string

  timezone: string

  initialStartDate: string
  initialEndDate: string
}


const providers = [
  'applyfy',
  'hotmart',
  'mundpay',
  'wiven',
  'perfectpay',
  'cartpanda',
  'kiwify',
  'greenn',
  'payt',
]


const statuses = [
  'paid',
  'pending',
  'refunded',
  'chargeback',
  'canceled',
  'disputed',
]


function numberValue(
  value:
    | number
    | string
    | null
) {
  const parsed =
    Number(
      value ??
      0
    )


  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0
}


function formatInteger(
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
        1,

      maximumFractionDigits:
        1,
    }
  )}%`
}


function formatProvider(
  provider: string
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
  }


  return (
    map[
      provider
        .toLowerCase()
    ] ??
    provider
  )
}


function formatStatus(
  status: string
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
  }


  return (
    map[
      status
    ] ??
    status
  )
}


function statusClasses(
  status: string
) {
  switch (
    status
  ) {
    case 'paid':
      return 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400'

    case 'pending':
      return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-400'

    case 'refunded':
      return 'border-blue-500/20 bg-blue-500/[0.07] text-blue-400'

    case 'chargeback':
    case 'disputed':
      return 'border-red-500/20 bg-red-500/[0.07] text-red-400'

    case 'canceled':
      return 'border-white/[0.07] bg-white/[0.03] text-zinc-500'

    default:
      return 'border-white/[0.07] bg-white/[0.03] text-zinc-500'
  }
}


function formatPaymentMethod(
  value:
    string | null
) {
  if (
    !value
  ) {
    return '—'
  }


  const normalized =
    value.toLowerCase()


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
  }


  return (
    map[
      normalized
    ] ??
    value
  )
}


function formatDateTime(
  value:
    string | null
) {
  if (
    !value
  ) {
    return '—'
  }


  const date =
    new Date(
      value
    )


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—'
  }


  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle:
        'short',

      timeStyle:
        'short',
    }
  ).format(
    date
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
        parsed.month -
          1,
        parsed.day +
          days
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


export default function SalesCenter({
  projectId,
  currency,
  timezone,
  initialStartDate,
  initialEndDate,
}: Props) {
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
    status,
    setStatus,
  ] =
    useState(
      'all'
    )


  const [
    provider,
    setProvider,
  ] =
    useState(
      'all'
    )


  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState(
      'all'
    )


  const [
    attribution,
    setAttribution,
  ] =
    useState(
      'all'
    )


  const [
    campaign,
    setCampaign,
  ] =
    useState(
      'all'
    )


  const [
    offer,
    setOffer,
  ] =
    useState(
      'all'
    )


  const [
    searchInput,
    setSearchInput,
  ] =
    useState(
      ''
    )


  const [
    search,
    setSearch,
  ] =
    useState(
      ''
    )


  const [
    sortBy,
    setSortBy,
  ] =
    useState<SalesSortKey>(
      'date'
    )


  const [
    sortDirection,
    setSortDirection,
  ] =
    useState<SortDirection>(
      'desc'
    )


  const [
    page,
    setPage,
  ] =
    useState(
      1
    )


  const [
    selectedOrderId,
    setSelectedOrderId,
  ] =
    useState<
      string | null
    >(
      null
    )


  const [
    data,
    setData,
  ] =
    useState<
      SalesResponse | null
    >(
      null
    )


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    )


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    )


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
          }
        ),
      [
        currency,
      ]
    )


  function formatMoney(
    value: number
  ) {
    return moneyFormatter
      .format(
        value
      )
  }


  /*
   * =====================================================
   * PERÍODOS RÁPIDOS
   * =====================================================
   */

  const today =
    formatDateInTimezone(
      new Date(),
      timezone
    )


  function applyToday() {
    setStartDate(
      today
    )

    setEndDate(
      today
    )

    setPage(
      1
    )
  }


  function applyYesterday() {
    const yesterday =
      addDays(
        today,
        -1
      )


    setStartDate(
      yesterday
    )

    setEndDate(
      yesterday
    )

    setPage(
      1
    )
  }


  function applyLastDays(
    days: number
  ) {
    setStartDate(
      addDays(
        today,
        -(days - 1)
      )
    )

    setEndDate(
      today
    )

    setPage(
      1
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
   * BUSCA COM DEBOUNCE
   * =====================================================
   */

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          setSearch(
            searchInput
              .trim()
          )

          setPage(
            1
          )
        },
        350
      )


    return () => {
      window.clearTimeout(
        timeout
      )
    }
  }, [
    searchInput,
  ])


  /*
   * =====================================================
   * CARREGAR VENDAS
   * =====================================================
   */

  const loadSales =
    useCallback(
      async (
        silent =
          false
      ) => {
        if (
          silent
        ) {
          setRefreshing(
            true
          )
        } else {
          setLoading(
            true
          )
        }


        setError(
          null
        )


        try {
          const params =
            new URLSearchParams({
              projectId,

              startDate,

              endDate,

              status,

              provider,

              paymentMethod,

              attribution,

              campaign,

              offer,

              sortBy,

              sortDirection,

              page:
                String(
                  page
                ),

              limit:
                '50',
            })


          if (
            search
          ) {
            params.set(
              'search',
              search
            )
          }


          const response =
            await fetch(
              `/api/sales?${params.toString()}`,
              {
                cache:
                  'no-store',
              }
            )


          const result:
            SalesResponse =
            await response
              .json()


          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                'Não foi possível carregar as vendas.'
            )
          }


          setData(
            result
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
        status,
        provider,
        paymentMethod,
        attribution,
        campaign,
        offer,
        sortBy,
        sortDirection,
        page,
        search,
      ]
    )


  useEffect(() => deferEffect(() => {
    void loadSales()
  }), [
    loadSales,
  ])


  /*
   * =====================================================
   * AUTO REFRESH
   * =====================================================
   */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          if (
            document
              .visibilityState ===
            'visible'
          ) {
            void loadSales(
              true
            )
          }
        },
        15000
      )


    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [
    loadSales,
  ])


  /*
   * =====================================================
   * DADOS
   * =====================================================
   */

  const summary =
    data?.summary


  const pagination =
    data?.pagination


  const items =
    data?.items ??
    []


  const filterOptions =
    data?.filterOptions ?? {
      paymentMethods:
        [],

      campaigns:
        [],

      offers:
        [],
    }


  const analysis =
    data?.analysis ?? {
      paymentMethods:
        [],

      providers:
        [],

      statuses:
        [],

      campaigns:
        [],

      attribution:
        [],
    }


  const totalOrders =
    summary?.totalOrders ??
    0


  const refundRate =
    totalOrders >
    0
      ? (
          (
            summary?.refunded ??
            0
          ) /
          totalOrders
        ) *
        100
      : 0


  const chargebackRate =
    totalOrders >
    0
      ? (
          (
            (
              summary?.chargebacks ??
              0
            ) +
            (
              summary?.disputed ??
              0
            )
          ) /
          totalOrders
        ) *
        100
      : 0


  /*
   * =====================================================
   * ORDENAÇÃO
   * =====================================================
   */

  function handleSort(
    key:
      SalesSortKey
  ) {
    if (
      sortBy ===
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

      setPage(
        1
      )

      return
    }


    setSortBy(
      key
    )


    setSortDirection(
      key ===
      'customer'
        ? 'asc'
        : 'desc'
    )


    setPage(
      1
    )
  }


  const hasActiveFilters =
    status !==
      'all' ||
    provider !==
      'all' ||
    paymentMethod !==
      'all' ||
    attribution !==
      'all' ||
    campaign !==
      'all' ||
    offer !==
      'all' ||
    searchInput.trim() !==
      '' ||
    startDate !==
      initialStartDate ||
    endDate !==
      initialEndDate


  function clearFilters() {
    setStatus(
      'all'
    )

    setProvider(
      'all'
    )

    setPaymentMethod(
      'all'
    )

    setAttribution(
      'all'
    )

    setCampaign(
      'all'
    )

    setOffer(
      'all'
    )

    setSearchInput(
      ''
    )

    setSearch(
      ''
    )

    setStartDate(
      initialStartDate
    )

    setEndDate(
      initialEndDate
    )

    setPage(
      1
    )
  }


  return (
    <>

      {/* =================================================
          RESUMO
      ================================================= */}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        <SummaryCard
          title="Pedidos"
          value={
            formatInteger(
              summary?.totalOrders ??
              0
            )
          }
        />


        <SummaryCard
          title="Aprovadas"
          value={
            formatInteger(
              summary?.approved ??
              0
            )
          }
          subtitle="Status pago"
        />


        <SummaryCard
          title="Pendentes"
          value={
            formatInteger(
              summary?.pending ??
              0
            )
          }
        />


        <SummaryCard
          title="Faturamento"
          value={
            formatMoney(
              summary?.approvedRevenue ??
              0
            )
          }
          subtitle="Pedidos pagos"
        />


        <SummaryCard
          title="Taxa de aprovação"
          value={
            formatPercent(
              summary?.approvalRate ??
              0
            )
          }
          subtitle="Pagos / pedidos do período"
        />


        <SummaryCard
          title="Ticket médio"
          value={
            (
              summary?.approved ??
              0
            ) >
            0
              ? formatMoney(
                  summary?.averageTicket ??
                  0
                )
              : '—'
          }
          subtitle="Pedidos pagos"
        />


        <SummaryCard
          title="Taxa de atribuição"
          value={
            formatPercent(
              summary?.attributionRate ??
              0
            )
          }
          subtitle="Com sessão Traffic Flow"
        />


        <SummaryCard
          title="Receita atribuída"
          value={
            formatMoney(
              summary?.attributedRevenue ??
              0
            )
          }
          subtitle="Pago + atribuído"
        />


        <SummaryCard
          title="Reembolsos"
          value={
            formatInteger(
              summary?.refunded ??
              0
            )
          }
          subtitle={`${formatPercent(
            refundRate
          )} dos pedidos`}
        />


        <SummaryCard
          title="Chargebacks"
          value={
            formatInteger(
              summary?.chargebacks ??
              0
            )
          }
          subtitle={`${formatPercent(
            chargebackRate
          )} incluindo disputas`}
        />


        <SummaryCard
          title="Canceladas"
          value={
            formatInteger(
              summary?.canceled ??
              0
            )
          }
        />


        <SummaryCard
          title="Em disputa"
          value={
            formatInteger(
              summary?.disputed ??
              0
            )
          }
        />


        <SummaryCard
          title="Atribuídas"
          value={
            formatInteger(
              summary?.attributed ??
              0
            )
          }
          subtitle="Com sessão Traffic Flow"
        />


        <SummaryCard
          title="Tokens pendentes"
          value={
            formatInteger(
              summary?.tokenPending ??
              0
            )
          }
          subtitle="Token recebido, sessão não resolvida"
          tone={
            (
              summary?.tokenPending ??
              0
            ) >
            0
              ? 'warning'
              : 'default'
          }
        />

      </div>


      {/* =================================================
          CENTRAL
      ================================================= */}

      <section className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

        {/* HEADER */}

        <div className="border-b border-white/[0.05] p-5 md:p-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                Pedidos
              </p>


              <h2 className="mt-1 text-sm font-semibold text-zinc-200">
                Histórico de vendas
              </h2>


              <p className="mt-1 text-xs text-zinc-600">
                Pedidos recebidos pelos checkouts integrados ao Traffic Flow.
              </p>

            </div>


            <div className="flex items-center gap-2">

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.06] px-3 text-xs text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-200"
                >

                  <RotateCcw
                    size={
                      13
                    }
                  />

                  Limpar filtros

                </button>
              )}


              <button
                type="button"
                onClick={() =>
                  loadSales(
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
                  today,
                  today
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
                    today,
                    -1
                  ),
                  addDays(
                    today,
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
                        today,
                        -(days - 1)
                      ),
                      today
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


          {/* LINHA 1 */}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">

            <div className="relative">

              <Search
                size={
                  14
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
              />


              <input
                value={
                  searchInput
                }
                onChange={(
                  event
                ) =>
                  setSearchInput(
                    event.target.value
                  )
                }
                placeholder="Cliente, e-mail ou pedido..."
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-black/20 pl-9 pr-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-700 focus:border-emerald-500/30"
              />

            </div>


            <select
              value={
                status
              }
              onChange={(
                event
              ) => {
                setStatus(
                  event.target.value
                )

                setPage(
                  1
                )
              }}
              className="h-10 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs text-zinc-400 outline-none"
            >

              <option value="all">
                Todos os status
              </option>


              {statuses.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {formatStatus(
                      item
                    )}
                  </option>
                )
              )}

            </select>


            <select
              value={
                provider
              }
              onChange={(
                event
              ) => {
                setProvider(
                  event.target.value
                )

                setPage(
                  1
                )
              }}
              className="h-10 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs text-zinc-400 outline-none"
            >

              <option value="all">
                Todos os checkouts
              </option>


              {providers.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {formatProvider(
                      item
                    )}
                  </option>
                )
              )}

            </select>


            <input
              type="date"
              value={
                startDate
              }
              onChange={(
                event
              ) => {
                setStartDate(
                  event.target.value
                )

                setPage(
                  1
                )
              }}
              className="h-10 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs text-zinc-400 outline-none"
            />


            <input
              type="date"
              value={
                endDate
              }
              onChange={(
                event
              ) => {
                setEndDate(
                  event.target.value
                )

                setPage(
                  1
                )
              }}
              className="h-10 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs text-zinc-400 outline-none"
            />

          </div>


          {/* LINHA 2 */}

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <select
              value={
                paymentMethod
              }
              onChange={(
                event
              ) => {
                setPaymentMethod(
                  event.target.value
                )

                setPage(
                  1
                )
              }}
              className="h-10 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs text-zinc-400 outline-none"
            >

              <option value="all">
                Todas as formas de pagamento
              </option>


              {filterOptions
                .paymentMethods
                .map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {formatPaymentMethod(
                        item
                      )}
                    </option>
                  )
                )}

            </select>


            <select
              value={
                attribution
              }
              onChange={(
                event
              ) => {
                setAttribution(
                  event.target.value
                )

                setPage(
                  1
                )
              }}
              className="h-10 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs text-zinc-400 outline-none"
            >

              <option value="all">
                Todas as atribuições
              </option>

              <option value="attributed">
                Atribuídas
              </option>

              <option value="token_pending">
                Token pendente
              </option>

              <option value="unattributed">
                Não atribuídas
              </option>

            </select>


            <select
              value={
                campaign
              }
              onChange={(
                event
              ) => {
                setCampaign(
                  event.target.value
                )

                setPage(
                  1
                )
              }}
              className="h-10 min-w-0 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs text-zinc-400 outline-none"
            >

              <option value="all">
                Todas as campanhas
              </option>


              {filterOptions
                .campaigns
                .map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {item}
                    </option>
                  )
                )}

            </select>


            <select
              value={
                offer
              }
              onChange={(
                event
              ) => {
                setOffer(
                  event.target.value
                )

                setPage(
                  1
                )
              }}
              className="h-10 min-w-0 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs text-zinc-400 outline-none"
            >

              <option value="all">
                Todas as ofertas
              </option>


              {filterOptions
                .offers
                .map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {item}
                    </option>
                  )
                )}

            </select>

          </div>
        </div>


        {error && (
          <div className="m-5 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-xs text-red-400 md:m-6">
            {error}
          </div>
        )}


        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">

            <div className="flex items-center gap-2 text-sm text-zinc-600">

              <RefreshCw
                size={
                  15
                }
                className="animate-spin"
              />

              Carregando vendas...

            </div>

          </div>
        ) : items.length ===
          0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-6">

            <div className="text-center">

              <p className="text-sm text-zinc-400">
                Nenhum pedido encontrado.
              </p>


              <p className="mt-2 text-xs text-zinc-600">
                Altere o período ou os filtros utilizados.
              </p>

            </div>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1500px] border-collapse">

              <thead>

                <tr className="border-b border-white/[0.05]">

                  <TableHead
                    className="sticky left-0 z-20 min-w-[190px] bg-[#0d0f13]"
                  >
                    Pedido
                  </TableHead>


                  <SortableTableHead
                    sortKey="customer"
                    activeKey={
                      sortBy
                    }
                    direction={
                      sortDirection
                    }
                    onSort={
                      handleSort
                    }
                  >
                    Cliente
                  </SortableTableHead>


                  <TableHead>
                    Checkout
                  </TableHead>


                  <SortableTableHead
                    sortKey="status"
                    activeKey={
                      sortBy
                    }
                    direction={
                      sortDirection
                    }
                    onSort={
                      handleSort
                    }
                  >
                    Status
                  </SortableTableHead>


                  <SortableTableHead
                    align="right"
                    sortKey="value"
                    activeKey={
                      sortBy
                    }
                    direction={
                      sortDirection
                    }
                    onSort={
                      handleSort
                    }
                  >
                    Valor
                  </SortableTableHead>


                  <TableHead>
                    Pagamento
                  </TableHead>


                  <TableHead>
                    Atribuição
                  </TableHead>


                  <TableHead>
                    Origem
                  </TableHead>


                  <SortableTableHead
                    align="right"
                    sortKey="date"
                    activeKey={
                      sortBy
                    }
                    direction={
                      sortDirection
                    }
                    onSort={
                      handleSort
                    }
                  >
                    Data
                  </SortableTableHead>

                </tr>

              </thead>


              <tbody>

                {items.map(
                  (
                    item
                  ) => {
                    const orderCode =
                      item.external_order_id ??
                      item.external_transaction_id ??
                      item.transaction_identifier ??
                      item.order_id.slice(
                        0,
                        8
                      )


                    const customer =
                      item.customer_name ??
                      item.customer_email ??
                      'Cliente não informado'


                    const origin =
                      item.ad_name ??
                      item.campaign_name ??
                      item.utm_campaign ??
                      item.utm_source ??
                      null


                    const tokenPending =
                      !item.is_attributed &&
                      item.attribution_status ===
                        'token_unresolved'


                    return (
                      <tr
                        key={
                          item.order_id
                        }
                        onClick={() =>
                          setSelectedOrderId(
                            item.order_id
                          )
                        }
                        className="cursor-pointer border-b border-white/[0.035] transition hover:bg-white/[0.03]"
                        title="Abrir detalhes da venda"
                      >

                        <td className="sticky left-0 z-10 bg-[#0d0f13] px-5 py-4 md:px-6">

                          <p className="max-w-[180px] truncate font-mono text-xs text-zinc-300">
                            {orderCode}
                          </p>


                          {item.offer_code && (
                            <p className="mt-1 max-w-[180px] truncate text-[10px] text-zinc-700">

                              Oferta{' '}

                              {item.offer_code}

                            </p>
                          )}

                        </td>


                        <td className="px-3 py-4">

                          <div className="max-w-[220px]">

                            <p className="truncate text-xs font-medium text-zinc-300">
                              {customer}
                            </p>


                            {item.customer_email &&
                              item.customer_name && (
                              <p className="mt-1 truncate text-[10px] text-zinc-700">
                                {item.customer_email}
                              </p>
                            )}

                          </div>

                        </td>


                        <td className="px-3 py-4 text-xs text-zinc-500">

                          {formatProvider(
                            item.provider
                          )}

                        </td>


                        <td className="px-3 py-4">

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium ${statusClasses(
                              item.order_status
                            )}`}
                          >
                            {formatStatus(
                              item.order_status
                            )}
                          </span>

                        </td>


                        <td className="whitespace-nowrap px-3 py-4 text-right text-xs font-medium text-zinc-200">

                          {formatMoney(
                            numberValue(
                              item.gross_amount
                            )
                          )}

                        </td>


                        <td className="px-3 py-4 text-xs text-zinc-500">

                          {formatPaymentMethod(
                            item.payment_method
                          )}


                          {item.installments &&
                            item.installments >
                              1 && (
                            <span className="ml-1 text-[10px] text-zinc-700">

                              {item.installments}x

                            </span>
                          )}

                        </td>


                        <td className="px-3 py-4">

                          {item.is_attributed ? (
                            <div>

                              <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                                Atribuída
                              </span>


                              <p className="mt-1 text-[9px] text-zinc-700">

                                {item.attribution_method ??
                                  'tracking'}

                              </p>

                            </div>
                          ) : tokenPending ? (
                            <div>

                              <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1 text-[10px] font-medium text-amber-400">
                                Token pendente
                              </span>


                              <p className="mt-1 text-[9px] text-zinc-700">
                                Sessão não resolvida
                              </p>

                            </div>
                          ) : (
                            <span className="inline-flex rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] text-zinc-600">
                              Não atribuída
                            </span>
                          )}

                        </td>


                        <td className="px-3 py-4">

                          <div className="max-w-[260px]">

                            {origin ? (
                              <>

                                <p className="truncate text-xs text-zinc-400">
                                  {origin}
                                </p>


                                {item.campaign_name &&
                                  item.ad_name && (
                                  <p className="mt-1 truncate text-[9px] text-zinc-700">
                                    {item.campaign_name}
                                  </p>
                                )}

                              </>
                            ) : (
                              <p className="text-xs text-zinc-700">
                                Sem origem
                              </p>
                            )}

                          </div>

                        </td>


                        <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-zinc-600 md:px-6">

                          {formatDateTime(
                            item.order_created_at
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


        {!loading &&
          pagination && (
          <div className="flex flex-col gap-3 border-t border-white/[0.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">

            <p className="text-[10px] text-zinc-700">

              {formatInteger(
                pagination.total
              )}{' '}

              {pagination.total ===
              1
                ? 'pedido'
                : 'pedidos'}

            </p>


            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.max(
                        1,
                        current -
                          1
                      )
                  )
                }
                disabled={
                  pagination.page <=
                  1
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-500 disabled:opacity-30"
              >

                <ChevronLeft
                  size={
                    14
                  }
                />

              </button>


              <span className="px-2 text-xs text-zinc-500">

                {pagination.page}{' '}
                /{' '}
                {pagination.totalPages}

              </span>


              <button
                type="button"
                onClick={() =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.min(
                        pagination.totalPages,
                        current +
                          1
                      )
                  )
                }
                disabled={
                  pagination.page >=
                  pagination.totalPages
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-500 disabled:opacity-30"
              >

                <ChevronRight
                  size={
                    14
                  }
                />

              </button>

            </div>

          </div>
        )}

      </section>


      <SalesAnalysis
        currency={
          currency
        }

        paymentMethods={
          analysis.paymentMethods
        }

        providers={
          analysis.providers
        }

        statuses={
          analysis.statuses
        }

        campaigns={
          analysis.campaigns
        }

        attribution={
          analysis.attribution
        }
      />


      <SalesOrderDrawer
        projectId={
          projectId
        }

        orderId={
          selectedOrderId
        }

        onClose={() =>
          setSelectedOrderId(
            null
          )
        }
      />

    </>
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


function SummaryCard({
  title,
  value,
  subtitle,
  tone =
    'default',
}: {
  title: string

  value: string

  subtitle?: string

  tone?:
    | 'default'
    | 'warning'
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

      <p className="text-xs font-medium text-zinc-500">
        {title}
      </p>


      <p
        className={`mt-3 text-2xl font-semibold tracking-tight ${
          tone ===
          'warning'
            ? 'text-amber-400'
            : 'text-white'
        }`}
      >
        {value}
      </p>


      {subtitle && (
        <p className="mt-2 text-[10px] text-zinc-700">
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

  sortKey:
    SalesSortKey

  activeKey:
    SalesSortKey

  direction:
    SortDirection

  onSort:
    (
      key:
        SalesSortKey
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
      }`}
    >

      <button
        type="button"
        onClick={() =>
          onSort(
            sortKey
          )
        }
        className="inline-flex items-center gap-1.5 transition hover:text-zinc-300"
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
