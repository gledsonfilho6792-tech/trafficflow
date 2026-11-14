'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  CheckCircle2,
  Circle,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'


type SourceResponse = {
  ok: boolean

  source?: {
    id: string
    name: string
    domain: string | null
    publicKey: string
    isActive: boolean
  } | null

  installation?: {
    status:
      | 'not_configured'
      | 'disabled'
      | 'domain_missing'
      | 'waiting'
      | 'detected'
      | 'stale'

    script: string | null

    supportedEvents: string[]

    lastDetectedAt:
      string | null

    lastDetectedPageUrl:
      string | null
  }

  error?: string
}


type HealthResponse = {
  ok: boolean

  tracking?: {
    status:
      | 'not_configured'
      | 'waiting'
      | 'active'
      | 'inactive'

    sources: {
      total: number
      active: number
    }
  }

  checkout?: {
    status:
      | 'not_configured'
      | 'waiting'
      | 'operational'
      | 'error'

    integrations: {
      id: string
      provider: string
      status: string | null
    }[]

    latestWebhook: {
      provider: string
      status: string | null
      received_at: string
    } | null
  }

  error?: string
}


type Props = {
  projectId: string
}


type CheckStatus =
  | 'ready'
  | 'pending'
  | 'error'


type ReadinessItem = {
  id: string
  title: string
  description: string
  status: CheckStatus
}


export default function TrackingReadiness({
  projectId,
}: Props) {
  const [
    sourceData,
    setSourceData,
  ] =
    useState<
      SourceResponse | null
    >(null)


  const [
    healthData,
    setHealthData,
  ] =
    useState<
      HealthResponse | null
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


  const loadReadiness =
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
          const [
            sourceResponse,
            healthResponse,
          ] =
            await Promise.all([
              fetch(
                `/api/tracking/source?projectId=${projectId}`,
                {
                  cache:
                    'no-store',
                }
              ),

              fetch(
                `/api/tracking/health?projectId=${projectId}`,
                {
                  cache:
                    'no-store',
                }
              ),
            ])


          const sourceResult:
            SourceResponse =
            await sourceResponse
              .json()


          const healthResult:
            HealthResponse =
            await healthResponse
              .json()


          if (
            !sourceResponse.ok ||
            !sourceResult.ok
          ) {
            throw new Error(
              sourceResult.error ??
                'Erro ao carregar configuração do tracking.'
            )
          }


          if (
            !healthResponse.ok ||
            !healthResult.ok
          ) {
            throw new Error(
              healthResult.error ??
                'Erro ao carregar saúde do tracking.'
            )
          }


          setSourceData(
            sourceResult
          )

          setHealthData(
            healthResult
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
      ]
    )


  useEffect(() => deferEffect(() => {
    void loadReadiness()
  }), [
    loadReadiness,
  ])


  /*
   * Atualiza o checklist
   * automaticamente.
   */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void loadReadiness(
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
    loadReadiness,
  ])


  const items =
    useMemo<
      ReadinessItem[]
    >(
      () => {
        const source =
          sourceData?.source


        const installation =
          sourceData
            ?.installation


        const health =
          healthData


        const checkoutIntegrations =
          health?.checkout
            ?.integrations ??
          []


        const hasCheckout =
          checkoutIntegrations
            .length >
          0


        const hasApplyfy =
          checkoutIntegrations
            .some(
              (
                integration
              ) =>
                integration
                  .provider
                  .toLowerCase() ===
                'applyfy'
            )


        const webhookOperational =
          health?.checkout
            ?.status ===
          'operational'


        const installationDetected =
          installation
            ?.status ===
          'detected'


        return [
          {
            id:
              'source',

            title:
              'Fonte criada',

            description:
              'Existe uma fonte de tracking vinculada ao projeto.',

            status:
              source
                ? 'ready'
                : 'pending',
          },

          {
            id:
              'active',

            title:
              'Fonte ativa',

            description:
              'A fonte está autorizada a receber novos eventos.',

            status:
              !source
                ? 'pending'
                : source
                    .isActive
                  ? 'ready'
                  : 'error',
          },

          {
            id:
              'domain',

            title:
              'Domínio configurado',

            description:
              source
                ?.domain
                ? source.domain
                : 'O domínio real ainda não foi definido.',

            status:
              source
                ?.domain
                ? 'ready'
                : 'pending',
          },

          {
            id:
              'script',

            title:
              'Script gerado',

            description:
              'Código de instalação disponível na aba Tracking.',

            status:
              installation
                ?.script
                ? 'ready'
                : 'pending',
          },

          {
            id:
              'meta',

            title:
              'Parâmetros Meta preparados',

            description:
              'Template para campanha, conjunto, anúncio e posicionamento disponível.',

            status:
              'ready',
          },

          {
            id:
              'checkout',

            title:
              'Checkout configurado',

            description:
              hasApplyfy
                ? 'Applyfy encontrada nas integrações do projeto.'
                : hasCheckout
                  ? 'Existe uma integração de checkout configurada.'
                  : 'Nenhum checkout configurado.',

            status:
              hasCheckout
                ? 'ready'
                : 'pending',
          },

          {
            id:
              'webhook',

            title:
              'Webhook operacional',

            description:
              webhookOperational
                ? 'O Traffic Flow já recebeu e processou eventos do checkout.'
                : 'Ainda não há atividade operacional confirmada.',

            status:
              health?.checkout
                ?.status ===
              'error'
                ? 'error'
                : webhookOperational
                  ? 'ready'
                  : 'pending',
          },

          {
            id:
              'installation',

            title:
              'Instalação detectada',

            description:
              installationDetected
                ? 'Page view detectado no domínio configurado.'
                : 'Ainda não executamos a instalação real no domínio.',

            status:
              installationDetected
                ? 'ready'
                : 'pending',
          },

          {
            id:
              'end-to-end',

            title:
              'Teste end-to-end',

            description:
              installationDetected &&
              webhookOperational
                ? 'Infraestrutura pronta para validar clique → checkout → venda.'
                : 'Será realizado somente após a instalação controlada.',

            /*
             * Não marcamos automaticamente
             * como concluído apenas por haver
             * eventos antigos de teste.
             *
             * A conclusão real acontecerá
             * na próxima fase.
             */
            status:
              'pending',
          },
        ]
      },
      [
        sourceData,
        healthData,
      ]
    )


  const readyCount =
    items.filter(
      (item) =>
        item.status ===
        'ready'
    ).length


  const errorCount =
    items.filter(
      (item) =>
        item.status ===
        'error'
    ).length


  const progress =
    items.length >
    0
      ? (
          readyCount /
          items.length
        ) * 100
      : 0


  if (loading) {
    return (
      <section className="mt-8 flex min-h-[240px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0d0f13]">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <RefreshCw
            size={15}
            className="animate-spin"
          />

          Verificando prontidão...
        </div>
      </section>
    )
  }


  if (error) {
    return (
      <section className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6">
        <p className="text-sm text-red-400">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            loadReadiness()
          }
          className="mt-4 rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-zinc-300"
        >
          Tentar novamente
        </button>
      </section>
    )
  }


  return (
    <section className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

      {/* HEADER */}

      <div className="flex flex-col gap-4 border-b border-white/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-400">
            <ShieldCheck
              size={18}
            />
          </div>


          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Prontidão
            </p>

            <h2 className="mt-1 text-sm font-semibold text-zinc-200">
              Checklist para instalação
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Validação antes de ativar o tracking em uma página real.
            </p>
          </div>
        </div>


        <button
          type="button"
          onClick={() =>
            loadReadiness(
              true
            )
          }
          disabled={
            refreshing
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-200 disabled:opacity-50"
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


      {/* PROGRESSO */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">

        <div className="flex items-end justify-between gap-4">

          <div>
            <p className="text-3xl font-semibold tracking-tight text-white">
              {readyCount}
              <span className="text-lg text-zinc-600">
                /{items.length}
              </span>
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              verificações concluídas
            </p>
          </div>


          <p className="text-sm font-medium text-zinc-300">
            {progress.toFixed(
              0
            )}
            %
          </p>
        </div>


        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>


        {errorCount >
          0 && (
          <p className="mt-3 text-[10px] text-red-400">
            {errorCount}{' '}
            {errorCount ===
            1
              ? 'item requer atenção.'
              : 'itens requerem atenção.'}
          </p>
        )}
      </div>


      {/* CHECKLIST */}

      <div className="divide-y divide-white/[0.04]">

        {items.map(
          (
            item
          ) => (
            <ReadinessRow
              key={
                item.id
              }
              item={
                item
              }
            />
          )
        )}
      </div>


      {/* FOOTER */}

      <div className="border-t border-white/[0.05] p-5 md:p-6">
        <p className="text-[10px] leading-5 text-zinc-700">
          Itens pendentes não significam falha. Domínio, detecção da instalação e teste end-to-end permanecerão pendentes até executarmos a instalação controlada.
        </p>
      </div>
    </section>
  )
}


function ReadinessRow({
  item,
}: {
  item:
    ReadinessItem
}) {
  const icon =
    item.status ===
    'ready'
      ? (
          <CheckCircle2
            size={17}
            className="text-emerald-400"
          />
        )
      : item.status ===
        'error'
        ? (
            <XCircle
              size={17}
              className="text-red-400"
            />
          )
        : (
            <Circle
              size={17}
              className="text-zinc-700"
            />
          )


  return (
    <div className="flex items-start gap-4 px-5 py-4 md:px-6">

      <div className="mt-0.5 shrink-0">
        {icon}
      </div>


      <div className="min-w-0">
        <p
          className={`text-xs font-medium ${
            item.status ===
            'ready'
              ? 'text-zinc-300'
              : item.status ===
                'error'
                ? 'text-red-300'
                : 'text-zinc-500'
          }`}
        >
          {item.title}
        </p>

        <p className="mt-1 text-[10px] leading-4 text-zinc-700">
          {item.description}
        </p>
      </div>
    </div>
  )
}