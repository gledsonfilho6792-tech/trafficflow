'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

import FinanceChart from '@/components/finance-chart'
import FinanceCampaignsTable from './finance-campaigns-table'
import FinanceMetaHierarchy from './finance-meta-hierarchy'
import FinanceKnownResult from './finance-known-result'
import FinanceExpensesManager from './finance-expenses-manager'


type DailyItem = {
  date: string

  investment: number

  approvedRevenue:
    number

  metaAttributedRevenue:
    number

  approvedOrders:
    number

  metaAttributedOrders:
    number
}


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

type FinanceResponse = {
  ok: boolean

  error?: string

  project?: {
    id: string
    name: string
    timezone: string
    currency: string
  }

  period?: {
    startDate: string
    endDate: string
  }

  summary?: {
    investment: number

    impressions: number
    clicks: number

    approvedOrders: number

    approvedRevenue: number

    metaAttributedOrders:
      number

    metaAttributedRevenue:
      number

    averageTicket: number

    cpa: number
    roas: number

    ctr: number
    cpc: number
    cpm: number

    missingFxRows: number
  }

costs?: {
  total: number

  checkoutFees: number

  taxes: number

  tools: number

  operational: number

  chargebackFees: number

  refundFees: number

  other: number

  count: number
}


knownResult?: {
  revenue: number

  mediaInvestment: number

  otherKnownCosts: number

  totalKnownCost: number

  operationalResult: number

  roi: number

  margin: number
}

  daily?: DailyItem[]

  campaigns?: CampaignItem[]

  adSets?: MetaEntityItem[]

  ads?: MetaEntityItem[]
}


type Props = {
  projectId: string

  currency: string

  initialStartDate: string

  initialEndDate: string
}


function formatInteger(
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


export default function FinanceCenter({
  projectId,
  currency,
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
    data,
    setData,
  ] =
    useState<
      FinanceResponse | null
    >(null)


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


  function money(
    value: number
  ) {
    return moneyFormatter
      .format(value)
  }


  /*
   * =====================================================
   * CARREGAR FINANCEIRO
   * =====================================================
   */

  const loadFinance =
    useCallback(
      async (
        silent = false
      ) => {
        if (silent) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }


        setError(null)


        try {
          const params =
            new URLSearchParams({
              projectId,

              startDate,

              endDate,
            })


          const response =
            await fetch(
              `/api/finance?${params.toString()}`,
              {
                cache:
                  'no-store',
              }
            )


          const result:
            FinanceResponse =
            await response
              .json()


          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                'Não foi possível carregar o financeiro.'
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
          setLoading(false)
          setRefreshing(false)
        }
      },
      [
        projectId,
        startDate,
        endDate,
      ]
    )


  useEffect(() => deferEffect(() => {
    void loadFinance()
  }), [
    loadFinance,
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
            void loadFinance(
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
    loadFinance,
  ])


  /*
   * =====================================================
   * DADOS
   * =====================================================
   */

  const summary =
    data?.summary

    const costs =
  data?.costs ?? {
    total: 0,

    checkoutFees: 0,

    taxes: 0,

    tools: 0,

    operational: 0,

    chargebackFees: 0,

    refundFees: 0,

    other: 0,

    count: 0,
  }


const knownResult =
  data?.knownResult ?? {
    revenue: 0,

    mediaInvestment: 0,

    otherKnownCosts: 0,

    totalKnownCost: 0,

    operationalResult: 0,

    roi: 0,

    margin: 0,
  }

  const daily:
    DailyItem[] =
    data?.daily ??
    []


  const campaigns:
    CampaignItem[] =
    data?.campaigns ??
    []

    const adSets:
  MetaEntityItem[] =
  data?.adSets ??
  []

    const ads:
  MetaEntityItem[] =
  data?.ads ??
  []

  return (
    <>
      {/* =================================================
          FILTRO
      ================================================= */}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

        <div className="flex flex-col gap-3 sm:flex-row">

          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">
              Data inicial
            </label>

            <input
              type="date"
              value={
                startDate
              }
              onChange={(
                event
              ) =>
                setStartDate(
                  event
                    .target
                    .value
                )
              }
              className="h-10 rounded-xl border border-white/[0.06] bg-[#0d0f13] px-3 text-xs text-zinc-400 outline-none"
            />
          </div>


          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">
              Data final
            </label>

            <input
              type="date"
              value={
                endDate
              }
              onChange={(
                event
              ) =>
                setEndDate(
                  event
                    .target
                    .value
                )
              }
              className="h-10 rounded-xl border border-white/[0.06] bg-[#0d0f13] px-3 text-xs text-zinc-400 outline-none"
            />
          </div>
        </div>


        <button
          type="button"
          onClick={() =>
            loadFinance(
              true
            )
          }
          disabled={
            refreshing
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-[#0d0f13] text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-200 disabled:opacity-40"
          title="Atualizar"
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />
        </button>
      </div>


      {/* =================================================
          ERRO
      ================================================= */}

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 text-xs text-red-400">
          {error}
        </div>
      )}


      {/* =================================================
          FX
      ================================================= */}

      {(summary?.missingFxRows ??
        0) >
        0 && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">

          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0 text-amber-400"
          />

          <div>
            <p className="text-xs font-medium text-amber-300">
              Conversão cambial pendente
            </p>

            <p className="mt-1 text-[10px] leading-5 text-zinc-600">
              Existem{' '}
              {
                summary
                  ?.missingFxRows
              }{' '}
              registros de investimento em moeda estrangeira sem conversão para BRL. Os valores financeiros podem estar subestimados.
            </p>
          </div>
        </div>
      )}


      {/* =================================================
          CARDS
      ================================================= */}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        <MetricCard
          title="Investimento Meta"
          value={
            money(
              summary
                ?.investment ??
                0
            )
          }
        />

        <MetricCard
          title="Receita aprovada"
          value={
            money(
              summary
                ?.approvedRevenue ??
                0
            )
          }
          subtitle="Todas as vendas pagas"
        />


        <MetricCard
          title="Receita Meta atribuída"
          value={
            money(
              summary
                ?.metaAttributedRevenue ??
                0
            )
          }
          subtitle="Pago + campanha Meta"
        />


        <MetricCard
          title="Vendas aprovadas"
          value={
            formatInteger(
              summary
                ?.approvedOrders ??
                0
            )
          }
        />


        <MetricCard
          title="Vendas Meta atribuídas"
          value={
            formatInteger(
              summary
                ?.metaAttributedOrders ??
                0
            )
          }
        />


        <MetricCard
          title="CPA Meta"
          value={
            (
              summary
                ?.metaAttributedOrders ??
              0
            ) > 0
              ? money(
                  summary
                    ?.cpa ??
                    0
                )
              : '—'
          }
          subtitle="Investimento / vendas atribuídas"
        />


        <MetricCard
          title="ROAS Meta"
          value={
            (
              summary
                ?.investment ??
              0
            ) > 0
              ? `${(
                  summary
                    ?.roas ??
                    0
                ).toFixed(
                  2
                )}x`
              : '—'
          }
          subtitle="Receita atribuída / investimento"
        />


        <MetricCard
          title="Ticket médio"
          value={
            (
              summary
                ?.approvedOrders ??
              0
            ) > 0
              ? money(
                  summary
                    ?.averageTicket ??
                    0
                )
              : '—'
          }
        />


        <MetricCard
          title="Impressões"
          value={
            formatInteger(
              summary
                ?.impressions ??
                0
            )
          }
        />


        <MetricCard
          title="Cliques"
          value={
            formatInteger(
              summary
                ?.clicks ??
                0
            )
          }
        />


        <MetricCard
          title="CTR"
          value={
            formatPercent(
              summary
                ?.ctr ??
                0
            )
          }
        />


        <MetricCard
          title="CPC"
          value={
            money(
              summary
                ?.cpc ??
                0
            )
          }
        />


        <MetricCard
          title="CPM"
          value={
            money(
              summary
                ?.cpm ??
                0
            )
          }
        />
      </div>

{/* RESULTADO OPERACIONAL */}

<FinanceKnownResult
  currency={
    currency
  }

  costs={
    costs
  }

  result={
    knownResult
  }
/>

<FinanceExpensesManager
  projectId={
    projectId
  }

  currency={
    currency
  }

  startDate={
    startDate
  }

  endDate={
    endDate
  }
/>

      {/* =================================================
          GRÁFICO
      ================================================= */}

      <section className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5 md:p-6">

        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            Evolução
          </p>

          <h2 className="mt-1 text-sm font-semibold text-zinc-200">
            Evolução financeira diária
          </h2>

          <p className="mt-1 text-xs text-zinc-600">
            Investimento Meta, receita aprovada e receita atribuída no período.
          </p>
        </div>


        <div className="mt-6">
          {loading ? (
            <div className="flex h-[340px] items-center justify-center">
              <RefreshCw
                size={18}
                className="animate-spin text-zinc-600"
              />
            </div>
          ) : (
            <FinanceChart
              data={
                daily
              }

              currency={
                currency
              }
            />
          )}
        </div>
      </section>


      {/* =================================================
          CAMPANHAS
      ================================================= */}

      <FinanceCampaignsTable
        campaigns={
          campaigns
        }

        currency={
          currency
        }
      />
      <FinanceMetaHierarchy
  campaigns={
    campaigns
  }

  adSets={
    adSets
  }

  ads={
    ads
  }

  currency={
    currency
  }
/>
    </>
  )
}


function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string

  value: string

  subtitle?: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

      <p className="text-xs font-medium text-zinc-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
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