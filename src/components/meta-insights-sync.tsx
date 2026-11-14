'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react'

type Props = {
  projectId: string
}

type LevelResult = {
  received?: number
  saved?: number
}

type InsightsResult = {
  ok?: boolean

  period?: {
    startDate?: string
    endDate?: string
  }

  imported?: {
    campaign?: LevelResult
    adSet?: LevelResult
    ad?: LevelResult
  }

  error?: string
  details?: string
}

type ExchangeResult = {
  ok?: boolean

  currency?: string
  pair?: string

  imported?: number

  appliedInsights?: number

  message?: string

  error?: string
  details?: string
}

type CombinedResult = {
  ok: boolean

  stage?:
    | 'insights'
    | 'exchange'

  insights?: InsightsResult

  exchange?: ExchangeResult

  error?: string
}

function formatLocalDate(
  date: Date
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0')

  const day =
    String(
      date.getDate()
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDefaultDates() {
  const end =
    new Date()

  const start =
    new Date()

  start.setDate(
    start.getDate() - 6
  )

  return {
    startDate:
      formatLocalDate(start),

    endDate:
      formatLocalDate(end),
  }
}

export default function MetaInsightsSync({
  projectId,
}: Props) {
  const router =
    useRouter()

  const defaults =
    getDefaultDates()

  const [
    startDate,
    setStartDate,
  ] = useState(
    defaults.startDate
  )

  const [
    endDate,
    setEndDate,
  ] = useState(
    defaults.endDate
  )

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    result,
    setResult,
  ] =
    useState<CombinedResult | null>(
      null
    )

  async function syncInsights() {
    setLoading(true)
    setResult(null)

    try {
      /*
       * ===================================================
       * 1. META INSIGHTS
       * ===================================================
       */

      const insightsResponse =
        await fetch(
          '/api/integrations/meta/sync-insights',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                projectId,
                startDate,
                endDate,
              }),
          }
        )

      const insightsData:
        InsightsResult =
        await insightsResponse.json()

      if (
        !insightsResponse.ok ||
        !insightsData.ok
      ) {
        setResult({
          ok: false,

          stage:
            'insights',

          insights:
            insightsData,

          error:
            insightsData.details ||
            insightsData.error ||
            'Não foi possível sincronizar as métricas da Meta.',
        })

        return
      }

      /*
       * ===================================================
       * 2. CÂMBIO / BRL
       * ===================================================
       */

      const exchangeResponse =
        await fetch(
          '/api/exchange-rates/sync',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                projectId,
                startDate,
                endDate,
              }),
          }
        )

      const exchangeData:
        ExchangeResult =
        await exchangeResponse.json()

      if (
        !exchangeResponse.ok ||
        !exchangeData.ok
      ) {
        setResult({
          ok: false,

          stage:
            'exchange',

          insights:
            insightsData,

          exchange:
            exchangeData,

          error:
            exchangeData.details ||
            exchangeData.error ||
            'As métricas foram sincronizadas, mas houve erro na conversão para BRL.',
        })

        return
      }

      /*
       * ===================================================
       * SUCESSO COMPLETO
       * ===================================================
       */

      setResult({
        ok: true,

        insights:
          insightsData,

        exchange:
          exchangeData,
      })

      router.refresh()
    } catch (error) {
      console.error(
        'META FULL SYNC ERROR:',
        error
      )

      setResult({
        ok: false,

        error:
          'Não foi possível concluir a sincronização.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400">
          <BarChart3
            size={18}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-200">
            Métricas Meta Ads
          </h2>

          <p className="mt-1 text-xs leading-5 text-zinc-600">
            Sincronize investimento,
            impressões, cliques, CTR,
            CPC, CPM e frequência.
            Contas em USD são convertidas
            automaticamente para BRL.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs text-zinc-500">
            Data inicial
          </span>

          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-white/[0.06] bg-[#090b0f] px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/40"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs text-zinc-500">
            Data final
          </span>

          <input
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-white/[0.06] bg-[#090b0f] px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/40"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={
          syncInsights
        }
        disabled={
          loading ||
          !startDate ||
          !endDate
        }
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <Loader2
            size={16}
            className="animate-spin"
          />
        ) : (
          <BarChart3
            size={16}
          />
        )}

        {loading
          ? 'Sincronizando e convertendo...'
          : 'Sincronizar métricas'}
      </button>

      {result?.ok && (
        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <CheckCircle2
              size={16}
            />

            Sincronização concluída
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ResultItem
              title="Campanhas"
              received={
                result.insights
                  ?.imported
                  ?.campaign
                  ?.received ?? 0
              }
              saved={
                result.insights
                  ?.imported
                  ?.campaign
                  ?.saved ?? 0
              }
            />

            <ResultItem
              title="Conjuntos"
              received={
                result.insights
                  ?.imported
                  ?.adSet
                  ?.received ?? 0
              }
              saved={
                result.insights
                  ?.imported
                  ?.adSet
                  ?.saved ?? 0
              }
            />

            <ResultItem
              title="Anúncios"
              received={
                result.insights
                  ?.imported
                  ?.ad
                  ?.received ?? 0
              }
              saved={
                result.insights
                  ?.imported
                  ?.ad
                  ?.saved ?? 0
              }
            />
          </div>

          <div className="mt-4 border-t border-emerald-500/10 pt-4">
            <p className="text-xs text-zinc-500">
              Conversão financeira
            </p>

            <p className="mt-1 text-sm text-zinc-300">
              {result.exchange
                ?.currency === 'USD'
                ? `USD → BRL aplicado em ${
                    result.exchange
                      ?.appliedInsights ??
                    0
                  } registros`
                : `Valores em BRL aplicados em ${
                    result.exchange
                      ?.appliedInsights ??
                    0
                  } registros`}
            </p>

            {result.exchange
              ?.currency === 'USD' && (
              <p className="mt-1 text-xs text-zinc-600">
                {
                  result.exchange
                    ?.imported ?? 0
                } cotações PTAX
                armazenadas
              </p>
            )}
          </div>
        </div>
      )}

      {result &&
        result.ok === false && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-red-300">
              <XCircle
                size={16}
              />

              {result.stage ===
              'exchange'
                ? 'Métricas salvas, mas houve erro no câmbio'
                : 'Erro na sincronização'}
            </div>

            <p className="mt-2 text-xs leading-5 text-red-300/80">
              {result.error ||
                'Erro inesperado.'}
            </p>

            {result.stage ===
              'exchange' && (
              <p className="mt-2 text-xs text-zinc-500">
                Os dados da Meta não
                foram perdidos. Apenas
                a etapa de conversão
                precisa ser corrigida.
              </p>
            )}
          </div>
        )}
    </div>
  )
}

function ResultItem({
  title,
  received,
  saved,
}: {
  title: string
  received: number
  saved: number
}) {
  return (
    <div>
      <p className="text-xs text-zinc-600">
        {title}
      </p>

      <p className="mt-1 text-sm font-medium text-zinc-300">
        {saved} salvos
      </p>

      <p className="mt-1 text-[11px] text-zinc-600">
        {received} recebidos
        da Meta
      </p>
    </div>
  )
}