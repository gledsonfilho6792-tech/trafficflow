'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Activity,
  Clock3,
  Eye,
  Radio,
  RefreshCw,
  ShoppingCart,
  Users,
  Webhook,
} from 'lucide-react'


type TrackingStatus =
  | 'not_configured'
  | 'waiting'
  | 'active'
  | 'inactive'


type CheckoutStatus =
  | 'not_configured'
  | 'waiting'
  | 'operational'
  | 'error'


type TrackingSource = {
  id: string
  name: string
  domain: string | null
  isActive: boolean
}


type CheckoutIntegration = {
  id: string
  provider: string
  status: string | null
}


type HealthResponse = {
  ok: boolean

  diagnostics?: {
    sessions: number
    events: number
    tokensCreated: number
    tokensUsed: number
    tokenUseRate: number | null
    orders: number
    attributed: number
    tokenPending: number
    unattributed: number
    alerts: string[]
  }

  error?: string

  project?: {
    id: string
    name: string
  }

  tracking?: {
    status: TrackingStatus

    sources: {
      total: number
      active: number
      items: TrackingSource[]
    }

    lastEvent: {
      event_name: string
      occurred_at: string
      page_url: string | null
    } | null

    lastPageView: {
      occurred_at: string
      page_url: string | null
    } | null

    lastPageViewMinutes: number | null

    lastCheckout: {
      occurred_at: string
      page_url: string | null
      metadata: Record<
        string,
        unknown
      > | null
    } | null

    lastCheckoutMinutes: number | null

    last24h: {
      sessions: number
      events: number
      pageViews: number
      initiateCheckouts: number
    }
  }

  checkout?: {
    status: CheckoutStatus

    integrations: CheckoutIntegration[]

    latestWebhook: {
      provider: string
      event_type: string | null
      status: string | null
      received_at: string
      processed_at: string | null
      error_message: string | null
    } | null

    lastWebhookMinutes: number | null

    webhooks24h: number
  }

  sales?: {
    latest: {
      id: string
      provider: string
      status: string
      gross_amount: number | string | null
      paid_at: string | null
      created_at: string
    } | null

    lastSaleMinutes: number | null
  }

  generatedAt?: string
}


type Props = {
  projectId: string
}


function formatElapsed(
  minutes:
    | number
    | null
    | undefined
) {
  if (
    minutes === null ||
    minutes === undefined
  ) {
    return 'Sem registro'
  }


  if (minutes < 1) {
    return 'agora'
  }


  if (minutes < 60) {
    return `há ${minutes} min`
  }


  const hours =
    Math.floor(
      minutes / 60
    )


  const remainingMinutes =
    minutes % 60


  if (hours < 24) {
    if (
      remainingMinutes ===
      0
    ) {
      return `há ${hours}h`
    }


    return `há ${hours}h ${remainingMinutes}min`
  }


  const days =
    Math.floor(
      hours / 24
    )


  return `há ${days} ${
    days === 1
      ? 'dia'
      : 'dias'
  }`
}


function formatDateTime(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return '—'
  }


  const date =
    new Date(value)


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
  ).format(date)
}


function formatProvider(
  provider: string
) {
  const normalized =
    provider
      .trim()
      .toLowerCase()


  const labels:
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
    labels[
      normalized
    ] ??
    provider
  )
}


function getTrackingStatusInfo(
  status:
    | TrackingStatus
    | undefined
) {
  switch (status) {
    case 'active':
      return {
        label:
          'Ativo',

        dot:
          'bg-emerald-400',

        text:
          'text-emerald-400',

        border:
          'border-emerald-500/20',

        background:
          'bg-emerald-500/[0.06]',
      }


    case 'inactive':
      return {
        label:
          'Inativo',

        dot:
          'bg-red-400',

        text:
          'text-red-400',

        border:
          'border-red-500/20',

        background:
          'bg-red-500/[0.06]',
      }


    case 'waiting':
      return {
        label:
          'Aguardando dados',

        dot:
          'bg-amber-400',

        text:
          'text-amber-400',

        border:
          'border-amber-500/20',

        background:
          'bg-amber-500/[0.06]',
      }


    default:
      return {
        label:
          'Não configurado',

        dot:
          'bg-zinc-500',

        text:
          'text-zinc-400',

        border:
          'border-white/[0.06]',

        background:
          'bg-white/[0.02]',
      }
  }
}


function getCheckoutStatusInfo(
  status:
    | CheckoutStatus
    | undefined
) {
  switch (status) {
    case 'operational':
      return {
        label:
          'Operacional',

        dot:
          'bg-emerald-400',

        text:
          'text-emerald-400',

        border:
          'border-emerald-500/20',

        background:
          'bg-emerald-500/[0.06]',
      }


    case 'error':
      return {
        label:
          'Erro',

        dot:
          'bg-red-400',

        text:
          'text-red-400',

        border:
          'border-red-500/20',

        background:
          'bg-red-500/[0.06]',
      }


    case 'waiting':
      return {
        label:
          'Aguardando dados',

        dot:
          'bg-amber-400',

        text:
          'text-amber-400',

        border:
          'border-amber-500/20',

        background:
          'bg-amber-500/[0.06]',
      }


    default:
      return {
        label:
          'Não configurado',

        dot:
          'bg-zinc-500',

        text:
          'text-zinc-400',

        border:
          'border-white/[0.06]',

        background:
          'bg-white/[0.02]',
      }
  }
}


export default function TrackingHealthPanel({
  projectId,
}: Props) {
  const [hours, setHours] = useState('24')
  const [sourceId, setSourceId] = useState('')
  const currentRequest = useRef(0)
  const [
    data,
    setData,
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


  const loadHealth =
    useCallback(
      async (
        silent = false
      ) => {
        const requestId = ++currentRequest.current
        if (silent) {
          setRefreshing(
            true
          )
        } else {
          setLoading(
            true
          )
        }


        setError(null)


        try {
          const response =
            await fetch(
              `/api/tracking/health?${new URLSearchParams({ projectId, hours, sourceId })}`,
              {
                cache:
                  'no-store',
              }
            )


          const result:
            HealthResponse =
            await response.json()


          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                'Não foi possível carregar a saúde do tracking.'
            )
          }


          if (requestId !== currentRequest.current) return
          setData(
            result
          )
        } catch (
          error
        ) {
          if (requestId !== currentRequest.current) return
          setError(
            error instanceof Error
              ? error.message
              : 'Erro inesperado.'
          )
        } finally {
          if (requestId === currentRequest.current) {
          setLoading(
            false
          )

          setRefreshing(
            false
          )
          }
        }
      },
      [
        projectId,
        hours,
        sourceId,
      ]
    )


  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void loadHealth() })
    return () => { active = false; currentRequest.current += 1 }
  }, [
    loadHealth,
  ])


  /*
   * Atualização automática
   * a cada 15 segundos.
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
            void loadHealth(
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
    loadHealth,
  ])


  if (loading) {
    return (
      <div className="mt-8 flex min-h-[320px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0d0f13]">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <RefreshCw
            size={15}
            className="animate-spin"
          />

          Verificando tracking...
        </div>
      </div>
    )
  }


  if (
    error ||
    !data
  ) {
    return (
      <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6">
        <p className="text-sm text-red-400">
          {error ??
            'Não foi possível carregar o diagnóstico.'}
        </p>

        <button
          type="button"
          onClick={() =>
            loadHealth()
          }
          className="mt-4 rounded-xl border border-white/[0.08] px-4 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.04]"
        >
          Tentar novamente
        </button>
      </div>
    )
  }


  const tracking =
    data.tracking


  const checkout =
    data.checkout


  const sales =
    data.sales


  const trackingStatus =
    getTrackingStatusInfo(
      tracking?.status
    )


  const checkoutStatus =
    getCheckoutStatusInfo(
      checkout?.status
    )


  return (
    <div className="mt-8 space-y-6">

      {/* =================================================
          HEADER DE SAÚDE
      ================================================= */}

      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-xs font-medium text-zinc-400">
            Monitoramento
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Diagnóstico automático da infraestrutura de tracking.
          </p>
        </div>


        <div className="flex items-center gap-3">

          {data.generatedAt && (
            <span className="hidden text-[10px] text-zinc-700 sm:block">
              Verificado{' '}
              {formatDateTime(
                data.generatedAt
              )}
            </span>
          )}


          <button
            type="button"
            onClick={() =>
              loadHealth(
                true
              )
            }
            disabled={
              refreshing
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-200 disabled:opacity-50"
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
      </div>


      {/* =================================================
          TRACKING
      ================================================= */}

      <section className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5 md:p-6" aria-label="Diagnóstico de atribuição">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Cadeia de tracking e atribuição</h2>
            <p className="mt-2 text-xs text-zinc-400">Sessões, eventos e pedidos recebidos na janela selecionada.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-zinc-400">Período
              <select value={hours} onChange={event => setHours(event.target.value)} className="ml-2 rounded-lg border border-white/10 bg-[#0d0f13] p-2 text-zinc-200">
                <option value="24">Últimas 24 horas</option><option value="168">Últimos 7 dias</option><option value="720">Últimos 30 dias</option>
              </select>
            </label>
            <label className="text-xs text-zinc-400">Fonte
              <select value={sourceId} onChange={event => setSourceId(event.target.value)} className="ml-2 max-w-full rounded-lg border border-white/10 bg-[#0d0f13] p-2 text-zinc-200">
                <option value="">Todas as fontes</option>
                {tracking?.sources.items.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
            </label>
          </div>
        </div>
        {data.diagnostics && <>
          <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Sessões', data.diagnostics.sessions], ['Eventos', data.diagnostics.events],
              ['Tokens criados', data.diagnostics.tokensCreated], ['Tokens usados em pedidos', data.diagnostics.tokensUsed],
              ['Pedidos', data.diagnostics.orders], ['Pedidos atribuídos', data.diagnostics.attributed],
              ['Token pendente', data.diagnostics.tokenPending], ['Sem atribuição', data.diagnostics.unattributed],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/5 p-4"><dt className="text-xs text-zinc-400">{label}</dt><dd className="mt-2 text-xl font-semibold text-white">{Number(value).toLocaleString('pt-BR')}</dd></div>)}
          </dl>
          <p className="mt-4 text-xs text-zinc-400">Uso dos tokens criados no período: {data.diagnostics.tokenUseRate === null ? 'Sem tokens no período' : `${data.diagnostics.tokenUseRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}. Um token sem uso pode pertencer a um visitante que ainda não comprou.</p>
          <ul className="mt-4 space-y-2 text-xs text-amber-300" aria-live="polite">
            {data.diagnostics.alerts.map(alert => <li key={alert}>{alert}</li>)}
          </ul>
        </>}
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

        <div className="flex flex-col gap-4 border-b border-white/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-400">
              <Radio
                size={18}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Tracking
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Sessões, visitantes e eventos capturados.
              </p>
            </div>
          </div>


          <StatusBadge
            label={
              trackingStatus.label
            }
            dot={
              trackingStatus.dot
            }
            text={
              trackingStatus.text
            }
            border={
              trackingStatus.border
            }
            background={
              trackingStatus.background
            }
          />
        </div>


        <div className="grid gap-px bg-white/[0.05] sm:grid-cols-2 lg:grid-cols-4">

          <HealthMetric
            icon={
              Users
            }
            title="Sessões 24h"
            value={
              tracking
                ?.last24h
                .sessions ??
              0
            }
          />

          <HealthMetric
            icon={
              Activity
            }
            title="Eventos 24h"
            value={
              tracking
                ?.last24h
                .events ??
              0
            }
          />

          <HealthMetric
            icon={
              Eye
            }
            title="Page Views 24h"
            value={
              tracking
                ?.last24h
                .pageViews ??
              0
            }
          />

          <HealthMetric
            icon={
              ShoppingCart
            }
            title="Checkouts 24h"
            value={
              tracking
                ?.last24h
                .initiateCheckouts ??
              0
            }
          />
        </div>


        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">

          <DetailCard
            title="Último page view"
            value={
              formatElapsed(
                tracking
                  ?.lastPageViewMinutes
              )
            }
            description={
              tracking
                ?.lastPageView
                ?.page_url ??
              'Nenhum page view registrado.'
            }
          />


          <DetailCard
            title="Último checkout iniciado"
            value={
              formatElapsed(
                tracking
                  ?.lastCheckoutMinutes
              )
            }
            description={
              tracking
                ?.lastCheckout
                ?.page_url ??
              'Nenhum checkout iniciado registrado.'
            }
          />
        </div>


        {/* FONTES */}

        <div className="border-t border-white/[0.05] p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-zinc-400">
                Fontes de tracking
              </p>

              <p className="mt-1 text-[10px] text-zinc-600">
                {
                  tracking
                    ?.sources
                    .active ??
                  0
                } ativa(s) de{' '}
                {
                  tracking
                    ?.sources
                    .total ??
                  0
                }
              </p>
            </div>
          </div>


          <div className="mt-4 space-y-2">
            {(
              tracking
                ?.sources
                .items ??
              []
            ).length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.06] px-4 py-5 text-xs text-zinc-600">
                Nenhuma fonte de tracking configurada.
              </div>
            ) : (
              tracking?.sources.items.map(
                (
                  source
                ) => (
                  <div
                    key={
                      source.id
                    }
                    className="flex flex-col gap-2 rounded-xl border border-white/[0.05] bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-300">
                        {
                          source.name
                        }
                      </p>

                      <p className="mt-1 truncate text-[10px] text-zinc-600">
                        {
                          source.domain ??
                          'Domínio ainda não definido'
                        }
                      </p>
                    </div>


                    <div
                      className={
                        source.isActive
                          ? 'flex items-center gap-2 text-[10px] text-emerald-400'
                          : 'flex items-center gap-2 text-[10px] text-zinc-600'
                      }
                    >
                      <span
                        className={
                          source.isActive
                            ? 'h-1.5 w-1.5 rounded-full bg-emerald-400'
                            : 'h-1.5 w-1.5 rounded-full bg-zinc-600'
                        }
                      />

                      {source.isActive
                        ? 'Ativa'
                        : 'Inativa'}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </section>


      {/* =================================================
          CHECKOUT / WEBHOOK
      ================================================= */}

      <section className="rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

        <div className="flex flex-col gap-4 border-b border-white/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-400">
              <Webhook
                size={18}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Checkout e Webhooks
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Comunicação entre os checkouts e o Traffic Flow.
              </p>
            </div>
          </div>


          <StatusBadge
            label={
              checkoutStatus.label
            }
            dot={
              checkoutStatus.dot
            }
            text={
              checkoutStatus.text
            }
            border={
              checkoutStatus.border
            }
            background={
              checkoutStatus.background
            }
          />
        </div>


        <div className="grid gap-px bg-white/[0.05] sm:grid-cols-3">

          <HealthMetric
            icon={
              Webhook
            }
            title="Webhooks 24h"
            value={
              checkout
                ?.webhooks24h ??
              0
            }
          />

          <HealthMetric
            icon={
              Clock3
            }
            title="Último webhook"
            value={
              formatElapsed(
                checkout
                  ?.lastWebhookMinutes
              )
            }
            textValue
          />

          <HealthMetric
            icon={
              ShoppingCart
            }
            title="Última venda"
            value={
              formatElapsed(
                sales
                  ?.lastSaleMinutes
              )
            }
            textValue
          />
        </div>


        <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">

          <DetailCard
            title="Último webhook recebido"
            value={
              checkout
                ?.latestWebhook
                ? formatProvider(
                    checkout
                      .latestWebhook
                      .provider
                  )
                : 'Sem registro'
            }
            description={
              checkout
                ?.latestWebhook
                ? `${
                    checkout
                      .latestWebhook
                      .event_type ??
                    'Evento'
                  } • ${formatDateTime(
                    checkout
                      .latestWebhook
                      .received_at
                  )}`
                : 'Nenhum webhook recebido até o momento.'
            }
          />


          <DetailCard
            title="Última venda aprovada"
            value={
              sales
                ?.latest
                ? formatProvider(
                    sales
                      .latest
                      .provider
                  )
                : 'Sem registro'
            }
            description={
              sales
                ?.latest
                ?.paid_at
                ? formatDateTime(
                    sales
                      .latest
                      .paid_at
                  )
                : 'Nenhuma venda aprovada registrada.'
            }
          />
        </div>


        {/* INTEGRAÇÕES */}

        <div className="border-t border-white/[0.05] p-5 md:p-6">
          <p className="text-xs font-medium text-zinc-400">
            Integrações de checkout
          </p>


          <div className="mt-4 flex flex-wrap gap-2">
            {(
              checkout
                ?.integrations ??
              []
            ).length ===
            0 ? (
              <span className="text-xs text-zinc-600">
                Nenhuma integração configurada.
              </span>
            ) : (
              checkout?.integrations.map(
                (
                  integration
                ) => (
                  <div
                    key={
                      integration.id
                    }
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <p className="text-xs font-medium text-zinc-300">
                      {formatProvider(
                        integration
                          .provider
                      )}
                    </p>

                    <p className="mt-1 text-[10px] text-zinc-600">
                      {
                        integration.status ??
                        'Configurada'
                      }
                    </p>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </section>
    </div>
  )
}


function StatusBadge({
  label,
  dot,
  text,
  border,
  background,
}: {
  label: string
  dot: string
  text: string
  border: string
  background: string
}) {
  return (
    <div
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${border} ${background} ${text}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${dot}`}
      />

      {label}
    </div>
  )
}


function HealthMetric({
  icon: Icon,
  title,
  value,
  textValue = false,
}: {
  icon:
    React.ComponentType<{
      size?: number
      className?: string
    }>

  title: string

  value:
    | number
    | string

  textValue?: boolean
}) {
  return (
    <div className="bg-[#0d0f13] p-5 md:p-6">
      <div className="flex items-center gap-2 text-zinc-600">
        <Icon
          size={14}
        />

        <p className="text-[10px] font-medium uppercase tracking-[0.1em]">
          {title}
        </p>
      </div>

      <p
        className={`mt-3 font-semibold tracking-tight text-zinc-100 ${
          textValue
            ? 'text-lg'
            : 'text-2xl'
        }`}
      >
        {value}
      </p>
    </div>
  )
}


function DetailCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/10 p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
        {title}
      </p>

      <p className="mt-2 text-sm font-medium text-zinc-300">
        {value}
      </p>

      <p className="mt-2 truncate text-[10px] text-zinc-600">
        {description}
      </p>
    </div>
  )
}
