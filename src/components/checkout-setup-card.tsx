'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
} from 'lucide-react'


type SetupResult = {
  ok: boolean

  error?: string

  integration?: {
    id: string
    provider: string
    status: string
    webhookTokenConfigured: boolean
  }

  webhook?: {
    url: string
  }

  tracking?: {
    sourceId: string
    sourceName: string
    publicKey: string
    domain: string | null
    script: string
  }
}


type HealthStatus =
  | 'operational'
  | 'configured'
  | 'needs_configuration'
  | 'not_configured'


type HealthResult = {
  ok: boolean

  error?: string

  configured?: boolean

  healthStatus?: HealthStatus

  integration?: {
    id: string
    storedStatus?: string
    webhookTokenConfigured: boolean
  } | null

  webhook?: {
    configured: boolean
    operational: boolean
    totalEvents: number
    lastReceivedAt: string | null
    lastEventType: string | null
    lastStatus: string | null
  }

  sales?: {
    totalPaid: number
    lastPaidAt: string | null
  }

  tracking?: {
    configured: boolean
    operational: boolean
    sourceId?: string | null
    domain?: string | null
    totalEvents: number
    lastActivityAt: string | null
  }
}


type Props = {
  projectId: string

  provider: string
  title: string

  autoLoad?: boolean
}


export default function CheckoutSetupCard({
  projectId,
  provider,
  title,
  autoLoad = false,
}: Props) {
  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    loadingHealth,
    setLoadingHealth,
  ] = useState(false)

  const [
    setup,
    setSetup,
  ] =
    useState<SetupResult | null>(
      null
    )

  const [
    health,
    setHealth,
  ] =
    useState<HealthResult | null>(
      null
    )

  const [
    token,
    setToken,
  ] = useState('')

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  const [
    copied,
    setCopied,
  ] =
    useState<string | null>(
      null
    )

  /*
   * Evita hydration mismatch.
   *
   * O horário só começa a ser
   * calculado depois que o navegador
   * monta o componente.
   */
  const [
    now,
    setNow,
  ] =
    useState<number | null>(
      null
    )


  /*
   * =====================================================
   * TEMPO RELATIVO
   * =====================================================
   */

  function formatElapsed(
    value:
      | string
      | null
      | undefined
  ) {
    if (
      !value ||
      now === null
    ) {
      return '—'
    }

    const timestamp =
      new Date(value)
        .getTime()

    if (
      Number.isNaN(
        timestamp
      )
    ) {
      return '—'
    }

    const seconds =
      Math.max(
        0,
        Math.floor(
          (
            now -
            timestamp
          ) /
            1000
        )
      )

    if (
      seconds < 10
    ) {
      return 'agora'
    }

    if (
      seconds < 60
    ) {
      return `há ${seconds}s`
    }

    const minutes =
      Math.floor(
        seconds / 60
      )

    if (
      minutes < 60
    ) {
      return `há ${minutes} min`
    }

    const hours =
      Math.floor(
        minutes / 60
      )

    if (
      hours < 24
    ) {
      return `há ${hours}h`
    }

    const days =
      Math.floor(
        hours / 24
      )

    return `há ${days} dia${
      days === 1
        ? ''
        : 's'
    }`
  }


  /*
   * =====================================================
   * SAÚDE DA INTEGRAÇÃO
   * =====================================================
   */

  const loadHealth =
    useCallback(
      async (
        silent = false
      ) => {
        if (!silent) {
          setLoadingHealth(
            true
          )
        }

        try {
          const response =
            await fetch(
              `/api/integrations/checkout/status?projectId=${projectId}&provider=${provider}`,
              {
                cache:
                  'no-store',
              }
            )

          const result:
            HealthResult =
            await response
              .json()

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                'Não foi possível verificar a integração.'
            )
          }

          setHealth(
            result
          )
        } catch (error) {
          if (!silent) {
            setError(
              error instanceof Error
                ? error.message
                : 'Erro inesperado.'
            )
          }
        } finally {
          if (!silent) {
            setLoadingHealth(
              false
            )
          }
        }
      },
      [
        projectId,
        provider,
      ]
    )


  /*
   * =====================================================
   * PREPARAR / CARREGAR INTEGRAÇÃO
   * =====================================================
   */

  const prepareIntegration =
    useCallback(
      async () => {
        setLoading(true)
        setError(null)

        try {
          const response =
            await fetch(
              '/api/integrations/checkout/setup',
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body:
                  JSON.stringify({
                    projectId,
                    provider,
                  }),
              }
            )

          const result:
            SetupResult =
            await response
              .json()

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                'Não foi possível preparar a integração.'
            )
          }

          setSetup(
            result
          )

          await loadHealth(
            true
          )
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : 'Erro inesperado.'
          )
        } finally {
          setLoading(false)
        }
      },
      [
        projectId,
        provider,
        loadHealth,
      ]
    )


  /*
   * =====================================================
   * AUTOLOAD
   * =====================================================
   */

  useEffect(() => deferEffect(() => {
    if (!autoLoad) {
      return
    }

    void prepareIntegration()
  }), [
    autoLoad,
    prepareIntegration,
  ])


  /*
   * =====================================================
   * RELÓGIO DA INTERFACE
   * =====================================================
   */

  useEffect(() => {
    const cancelInitialClock = deferEffect(() => setNow(Date.now()))

    const interval =
      window.setInterval(
        () => {
          setNow(
            Date.now()
          )
        },
        1000
      )

    return () => {
      cancelInitialClock()
      window.clearInterval(
        interval
      )
    }
  }, [])


  /*
   * =====================================================
   * ATUALIZAÇÃO AUTOMÁTICA DA SAÚDE
   * =====================================================
   */

  useEffect(() => {
    if (!setup) {
      return
    }

    const cancelInitialHealth = deferEffect(() => { void loadHealth(true) })

    const interval =
      window.setInterval(
        () => {
          void loadHealth(
            true
          )
        },
        30000
      )

    return () => {
      cancelInitialHealth()
      window.clearInterval(
        interval
      )
    }
  }, [
    setup,
    loadHealth,
  ])


  /*
   * =====================================================
   * SALVAR TOKEN
   * =====================================================
   */

  async function saveToken() {
    if (
      !token.trim()
    ) {
      setError(
        'Informe o token gerado pela plataforma.'
      )

      return
    }

    setSaving(true)
    setError(null)

    try {
      const response =
        await fetch(
          '/api/integrations/checkout/setup',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                projectId,
                provider,

                webhookToken:
                  token.trim(),
              }),
          }
        )

      const result:
        SetupResult =
        await response
          .json()

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            'Não foi possível salvar o token.'
        )
      }

      setSetup(
        result
      )

      /*
       * Nunca mantemos o token
       * original no navegador.
       */
      setToken('')

      await loadHealth()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Erro inesperado.'
      )
    } finally {
      setSaving(false)
    }
  }


  /*
   * =====================================================
   * COPIAR
   * =====================================================
   */

  async function copyValue(
    key: string,
    value: string
  ) {
    try {
      await navigator
        .clipboard
        .writeText(value)

      setCopied(key)

      window.setTimeout(
        () => {
          setCopied(null)
        },
        1500
      )
    } catch {
      setError(
        'Não foi possível copiar.'
      )
    }
  }


  /*
   * =====================================================
   * ESTADO REAL
   * =====================================================
   */

  const tokenConfigured =
    Boolean(
      health
        ?.integration
        ?.webhookTokenConfigured ??
      setup
        ?.integration
        ?.webhookTokenConfigured
    )


  const healthStatus =
    health
      ?.healthStatus


  const operational =
    healthStatus ===
      'operational'


  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-5">

      {/* HEADER */}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Checkout
          </p>

          <h3 className="mt-1 text-base font-semibold text-zinc-200">
            {title}
          </h3>
        </div>


        {operational ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

            Operacional
          </span>
        ) : healthStatus ===
            'configured' ? (
          <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />

            Configurada
          </span>
        ) : setup ? (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />

            Aguardando configuração
          </span>
        ) : null}
      </div>


      {/* NÃO CONFIGURADA */}

      {!setup &&
        !loading && (
        <div className="mt-6">
          <p className="text-sm leading-6 text-zinc-500">
            O Traffic Flow vai preparar automaticamente
            o webhook e a fonte de tracking deste projeto.
          </p>

          <button
            type="button"
            onClick={
              prepareIntegration
            }
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-emerald-400"
          >
            Configurar {title}
          </button>
        </div>
      )}


      {/* LOADING */}

      {loading &&
        !setup && (
        <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2
            size={16}
            className="animate-spin"
          />

          Carregando integração...
        </div>
      )}


      {setup?.webhook &&
        setup?.tracking && (
        <div className="mt-6 space-y-6">

          {/* =================================================
              SAÚDE
          ================================================= */}

          <div className="rounded-xl border border-white/[0.05] bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity
                  size={15}
                  className={
                    operational
                      ? 'text-emerald-400'
                      : 'text-zinc-500'
                  }
                />

                <p className="text-sm font-medium text-zinc-300">
                  Saúde da integração
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadHealth()
                }
                disabled={
                  loadingHealth
                }
                title="Atualizar"
                className="text-zinc-600 transition hover:text-zinc-300 disabled:opacity-40"
              >
                <RefreshCw
                  size={14}
                  className={
                    loadingHealth
                      ? 'animate-spin'
                      : ''
                  }
                />
              </button>
            </div>


            {health ? (
              <div className="mt-4 grid gap-3">

                {/* WEBHOOK */}

                <HealthRow
                  title="Webhook"
                  active={
                    Boolean(
                      health
                        .webhook
                        ?.operational
                    )
                  }
                  detail={
                    health
                      .webhook
                      ?.lastReceivedAt
                      ? `Último evento ${formatElapsed(
                          health
                            .webhook
                            .lastReceivedAt
                        )}`
                      : 'Nenhum evento recebido'
                  }
                  value={
                    `${
                      health
                        .webhook
                        ?.totalEvents ??
                      0
                    } eventos`
                  }
                />


                {/* TRACKING */}

                <HealthRow
                  title="Tracking"
                  active={
                    Boolean(
                      health
                        .tracking
                        ?.operational
                    )
                  }
                  detail={
                    health
                      .tracking
                      ?.lastActivityAt
                      ? `Última atividade ${formatElapsed(
                          health
                            .tracking
                            .lastActivityAt
                        )}`
                      : health
                          .tracking
                          ?.configured
                        ? 'Instalado, aguardando atividade'
                        : 'Não configurado'
                  }
                  value={
                    `${
                      health
                        .tracking
                        ?.totalEvents ??
                      0
                    } eventos`
                  }
                />


                {/* VENDAS */}

                <HealthRow
                  title="Vendas aprovadas"
                  active={
                    (
                      health
                        .sales
                        ?.totalPaid ??
                      0
                    ) > 0
                  }
                  neutral={
                    (
                      health
                        .sales
                        ?.totalPaid ??
                      0
                    ) === 0
                  }
                  detail={
                    health
                      .sales
                      ?.lastPaidAt
                      ? `Última venda ${formatElapsed(
                          health
                            .sales
                            .lastPaidAt
                        )}`
                      : 'Nenhuma venda aprovada armazenada'
                  }
                  value={
                    String(
                      health
                        .sales
                        ?.totalPaid ??
                      0
                    )
                  }
                />
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
                <Loader2
                  size={13}
                  className="animate-spin"
                />

                Verificando atividade...
              </div>
            )}
          </div>


          {/* =================================================
              WEBHOOK URL
          ================================================= */}

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-zinc-300">
                URL do Webhook
              </p>

              <span className="text-[10px] text-zinc-600">
                Gerada automaticamente
              </span>
            </div>

            <div className="flex gap-2">
              <input
                readOnly
                value={
                  setup.webhook.url
                }
                className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-xs text-zinc-400 outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  copyValue(
                    'webhook',
                    setup
                      .webhook!
                      .url
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-200"
              >
                {copied ===
                'webhook' ? (
                  <Check
                    size={16}
                  />
                ) : (
                  <Copy
                    size={16}
                  />
                )}
              </button>
            </div>
          </div>


          {/* =================================================
              TOKEN
          ================================================= */}

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-zinc-300">
                Token do Webhook
              </p>

              {tokenConfigured && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2
                    size={12}
                  />

                  Configurado
                </span>
              )}
            </div>

            <input
              type="password"
              value={token}
              onChange={(
                event
              ) =>
                setToken(
                  event
                    .target
                    .value
                )
              }
              placeholder={
                tokenConfigured
                  ? 'Informe somente se quiser substituir'
                  : `Cole o token gerado pela ${title}`
              }
              className="w-full rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 text-sm text-zinc-300 outline-none transition focus:border-emerald-500/40"
            />

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              O Traffic Flow não armazena o token original.
            </p>

            <button
              type="button"
              onClick={
                saveToken
              }
              disabled={
                saving ||
                !token.trim()
              }
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving && (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              )}

              {tokenConfigured
                ? 'Atualizar token'
                : 'Salvar token'}
            </button>
          </div>


          {/* =================================================
              TRACKING
          ================================================= */}

          <div className="border-t border-white/[0.05] pt-5">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={15}
                className="text-emerald-400"
              />

              <p className="text-sm font-medium text-zinc-300">
                Fonte de tracking
              </p>
            </div>

            <p className="mt-1 text-xs text-zinc-600">
              {
                setup
                  .tracking
                  .sourceName
              }
            </p>


            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-zinc-300">
                  Script
                </p>

                <span className="text-[10px] text-zinc-600">
                  Gerado automaticamente
                </span>
              </div>

              <div className="flex gap-2">
                <textarea
                  readOnly
                  rows={3}
                  value={
                    setup
                      .tracking
                      .script
                  }
                  className="min-w-0 flex-1 resize-none rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 font-mono text-xs text-zinc-400 outline-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    copyValue(
                      'script',
                      setup
                        .tracking!
                        .script
                    )
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-200"
                >
                  {copied ===
                  'script' ? (
                    <Check
                      size={16}
                    />
                  ) : (
                    <Copy
                      size={16}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ERRO */}

      {error && (
        <div className="mt-4 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-sm text-red-400">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0"
          />

          {error}
        </div>
      )}
    </div>
  )
}


/*
 * =========================================================
 * LINHA DA SAÚDE
 * =========================================================
 */

function HealthRow({
  title,
  active,
  neutral = false,
  detail,
  value,
}: {
  title: string
  active: boolean
  neutral?: boolean
  detail: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={
              neutral
                ? 'h-1.5 w-1.5 rounded-full bg-zinc-600'
                : active
                  ? 'h-1.5 w-1.5 rounded-full bg-emerald-400'
                  : 'h-1.5 w-1.5 rounded-full bg-amber-400'
            }
          />

          <p className="text-xs font-medium text-zinc-300">
            {title}
          </p>
        </div>

        <p className="mt-1 truncate pl-3.5 text-[10px] text-zinc-600">
          {detail}
        </p>
      </div>

      <span className="shrink-0 text-xs font-medium text-zinc-400">
        {value}
      </span>
    </div>
  )
}