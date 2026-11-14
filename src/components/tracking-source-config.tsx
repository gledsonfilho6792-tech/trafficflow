'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Check,
  Clipboard,
  Code2,
  ExternalLink,
  Globe2,
  KeyRound,
  Power,
  RefreshCw,
  Save,
} from 'lucide-react'


type InstallationStatus =
  | 'not_configured'
  | 'disabled'
  | 'domain_missing'
  | 'waiting'
  | 'detected'
  | 'stale'


type SourceResponse = {
  ok: boolean

  error?: string

  project?: {
    id: string
    name: string
  }

  source?: {
    id: string
    name: string
    domain: string | null
    publicKey: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  } | null

  installation?: {
    status: InstallationStatus

    environment:
      | 'production'
      | 'development'

    publicBaseUrl: string

    scriptUrl: string

    script: string | null

    supportedEvents: string[]

    lastDetectedAt:
      string | null

    lastDetectedPageUrl:
      string | null

    lastDetectedMinutes:
      number | null
  }
}


type Props = {
  projectId: string
}


function formatElapsed(
  minutes:
    | number
    | null
) {
  if (
    minutes === null
  ) {
    return 'Sem detecção'
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


  if (hours < 24) {
    return `há ${hours}h`
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


function getInstallationStatus(
  status:
    | InstallationStatus
    | undefined
) {
  switch (status) {
    case 'detected':
      return {
        label:
          'Instalação detectada',

        description:
          'Eventos do domínio configurado estão chegando ao Traffic Flow.',

        classes:
          'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400',

        dot:
          'bg-emerald-400',
      }


    case 'waiting':
      return {
        label:
          'Aguardando detecção',

        description:
          'A fonte está configurada, mas ainda não detectamos page view nesse domínio.',

        classes:
          'border-amber-500/20 bg-amber-500/[0.06] text-amber-400',

        dot:
          'bg-amber-400',
      }


    case 'stale':
      return {
        label:
          'Sem atividade recente',

        description:
          'A instalação já foi detectada, mas não houve page view desse domínio nas últimas 24 horas.',

        classes:
          'border-amber-500/20 bg-amber-500/[0.06] text-amber-400',

        dot:
          'bg-amber-400',
      }


    case 'domain_missing':
      return {
        label:
          'Domínio pendente',

        description:
          'Informe o domínio que será autorizado a enviar eventos.',

        classes:
          'border-amber-500/20 bg-amber-500/[0.06] text-amber-400',

        dot:
          'bg-amber-400',
      }


    case 'disabled':
      return {
        label:
          'Fonte desativada',

        description:
          'O endpoint não aceitará eventos enquanto a fonte estiver inativa.',

        classes:
          'border-red-500/20 bg-red-500/[0.06] text-red-400',

        dot:
          'bg-red-400',
      }


    default:
      return {
        label:
          'Não configurada',

        description:
          'Crie uma fonte para começar a configurar o tracking.',

        classes:
          'border-white/[0.06] bg-white/[0.02] text-zinc-400',

        dot:
          'bg-zinc-500',
      }
  }
}


export default function TrackingSourceConfig({
  projectId,
}: Props) {
  const [
    data,
    setData,
  ] =
    useState<
      SourceResponse | null
    >(null)


  const [
    name,
    setName,
  ] =
    useState('')


  const [
    domain,
    setDomain,
  ] =
    useState('')


  const [
    isActive,
    setIsActive,
  ] =
    useState(true)


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    saving,
    setSaving,
  ] =
    useState(false)


  const [
    creating,
    setCreating,
  ] =
    useState(false)


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


  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(null)


  const [
    copied,
    setCopied,
  ] =
    useState<
      'key' |
      'script' |
      null
    >(null)


  const syncFields =
    useCallback(
      (
        result:
          SourceResponse
      ) => {
        setData(
          result
        )


        setName(
          result.source
            ?.name ??
          ''
        )


        setDomain(
          result.source
            ?.domain ??
          ''
        )


        setIsActive(
          result.source
            ?.isActive ??
          true
        )
      },
      []
    )


  const loadSource =
    useCallback(
      async (
        silent = false
      ) => {
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
              `/api/tracking/source?projectId=${projectId}`,
              {
                cache:
                  'no-store',
              }
            )


          const result:
            SourceResponse =
            await response.json()


          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                'Erro ao carregar fonte.'
            )
          }


          syncFields(
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
        syncFields,
      ]
    )


  useEffect(() => deferEffect(() => {
    void loadSource()
  }), [
    loadSource,
  ])


  async function createSource() {
    setCreating(
      true
    )

    setError(null)
    setSuccess(null)


    try {
      const response =
        await fetch(
          '/api/tracking/source',
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
              }),
          }
        )


      const result:
        SourceResponse =
        await response.json()


      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            'Erro ao criar fonte.'
        )
      }


      syncFields(
        result
      )


      setSuccess(
        'Fonte criada com sucesso.'
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
      setCreating(
        false
      )
    }
  }


  async function saveSource() {
    if (
      !data?.source
    ) {
      return
    }


    setSaving(
      true
    )

    setError(null)
    setSuccess(null)


    try {
      const response =
        await fetch(
          '/api/tracking/source',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                projectId,

                sourceId:
                  data.source
                    .id,

                name,

                domain,

                isActive,
              }),
          }
        )


      const result:
        SourceResponse =
        await response.json()


      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            'Erro ao salvar fonte.'
        )
      }


      syncFields(
        result
      )


      setSuccess(
        'Configuração salva.'
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
      setSaving(
        false
      )
    }
  }


  async function copyValue(
    type:
      | 'key'
      | 'script',
    value: string
  ) {
    try {
      await navigator
        .clipboard
        .writeText(
          value
        )


      setCopied(
        type
      )


      window.setTimeout(
        () => {
          setCopied(
            null
          )
        },
        1600
      )
    } catch {
      setError(
        'Não foi possível copiar.'
      )
    }
  }


  if (loading) {
    return (
      <section className="mt-8 flex min-h-[280px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0d0f13]">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <RefreshCw
            size={15}
            className="animate-spin"
          />

          Carregando configuração...
        </div>
      </section>
    )
  }


  if (
    !data?.source
  ) {
    return (
      <section className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0d0f13] p-6">
        <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-500">
            <Code2
              size={19}
            />
          </div>

          <p className="mt-4 text-sm font-medium text-zinc-300">
            Nenhuma fonte de tracking
          </p>

          <p className="mt-2 max-w-md text-xs leading-5 text-zinc-600">
            Crie a fonte principal para gerar a Public Key e o script de instalação.
          </p>

          <button
            type="button"
            onClick={
              createSource
            }
            disabled={
              creating
            }
            className="mt-5 rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {creating
              ? 'Criando...'
              : 'Criar fonte principal'}
          </button>

          {error && (
            <p className="mt-4 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      </section>
    )
  }


  const installation =
    data.installation


  const installationStatus =
    getInstallationStatus(
      installation
        ?.status
    )


  return (
    <section className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

      {/* HEADER */}

      <div className="flex flex-col gap-4 border-b border-white/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">

        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            Instalação
          </p>

          <h2 className="mt-1 text-sm font-semibold text-zinc-200">
            Configuração do Tracking
          </h2>

          <p className="mt-1 text-xs text-zinc-600">
            Configure a fonte e obtenha o código de instalação do Traffic Flow.
          </p>
        </div>


        <button
          type="button"
          onClick={() =>
            loadSource(
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
            size={15}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />
        </button>
      </div>


      {/* STATUS */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">
        <div
          className={`rounded-xl border p-4 ${installationStatus.classes}`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${installationStatus.dot}`}
            />

            <div>
              <p className="text-xs font-medium">
                {
                  installationStatus
                    .label
                }
              </p>

              <p className="mt-1 text-[10px] leading-4 opacity-70">
                {
                  installationStatus
                    .description
                }
              </p>

              {installation
                ?.lastDetectedPageUrl && (
                <p className="mt-2 max-w-3xl truncate text-[10px] opacity-60">
                  Última detecção:{' '}
                  {
                    installation
                      .lastDetectedPageUrl
                  }{' '}
                  •{' '}
                  {formatElapsed(
                    installation
                      .lastDetectedMinutes ??
                    null
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* CONFIGURAÇÃO */}

      <div className="grid gap-6 border-b border-white/[0.05] p-5 lg:grid-cols-2 md:p-6">

        <div>
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">
              Nome da fonte
            </span>

            <input
              value={
                name
              }
              onChange={(
                event
              ) =>
                setName(
                  event
                    .target
                    .value
                )
              }
              className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-3 text-xs text-zinc-300 outline-none transition focus:border-emerald-500/30"
            />
          </label>


          <label className="mt-5 block">
            <span className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Globe2
                size={14}
              />

              Domínio autorizado
            </span>

            <input
              value={
                domain
              }
              onChange={(
                event
              ) =>
                setDomain(
                  event
                    .target
                    .value
                )
              }
              placeholder="exemplo.com"
              className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/20 px-3.5 py-3 text-xs text-zinc-300 outline-none transition placeholder:text-zinc-700 focus:border-emerald-500/30"
            />

            <p className="mt-2 text-[10px] leading-4 text-zinc-700">
              O Traffic Flow aceitará eventos desse domínio e de seus subdomínios.
            </p>
          </label>
        </div>


        <div>
          <div className="rounded-xl border border-white/[0.05] bg-black/10 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Power
                size={14}
              />

              Status da fonte
            </div>


            <button
              type="button"
              onClick={() =>
                setIsActive(
                  (
                    current
                  ) =>
                    !current
                )
              }
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="text-left">
                <p className="text-xs font-medium text-zinc-300">
                  {isActive
                    ? 'Fonte ativa'
                    : 'Fonte inativa'}
                </p>

                <p className="mt-1 text-[10px] text-zinc-600">
                  {isActive
                    ? 'Eventos podem ser recebidos.'
                    : 'Novos eventos serão bloqueados.'}
                </p>
              </div>


              <span
                className={`relative inline-flex h-6 w-11 rounded-full transition ${
                  isActive
                    ? 'bg-emerald-500'
                    : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    isActive
                      ? 'left-6'
                      : 'left-1'
                  }`}
                />
              </span>
            </button>
          </div>


          <div className="mt-4 rounded-xl border border-white/[0.05] bg-black/10 p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
              Ambiente
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-zinc-300">
                {installation
                  ?.environment ===
                'development'
                  ? 'Desenvolvimento'
                  : 'Produção'}
              </span>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[10px] text-emerald-400">
                {
                  installation
                    ?.publicBaseUrl
                }
              </span>
            </div>
          </div>
        </div>


        <div className="lg:col-span-2">
          <button
            type="button"
            onClick={
              saveSource
            }
            disabled={
              saving
            }
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            <Save
              size={14}
            />

            {saving
              ? 'Salvando...'
              : 'Salvar configuração'}
          </button>


          {success && (
            <span className="ml-3 text-xs text-emerald-400">
              {success}
            </span>
          )}


          {error && (
            <span className="ml-3 text-xs text-red-400">
              {error}
            </span>
          )}
        </div>
      </div>


      {/* PUBLIC KEY */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">
        <div className="flex items-center gap-2">
          <KeyRound
            size={14}
            className="text-zinc-600"
          />

          <p className="text-xs font-medium text-zinc-400">
            Public Key
          </p>
        </div>


        <div className="mt-3 flex gap-2">
          <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 font-mono text-xs text-zinc-400">
            <p className="truncate">
              {
                data.source
                  .publicKey
              }
            </p>
          </div>


          <button
            type="button"
            onClick={() =>
              copyValue(
                'key',
                data.source!
                  .publicKey
              )
            }
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-200"
            title="Copiar Public Key"
          >
            {copied ===
            'key' ? (
              <Check
                size={15}
              />
            ) : (
              <Clipboard
                size={15}
              />
            )}
          </button>
        </div>


        <p className="mt-2 text-[10px] text-zinc-700">
          Identificador público usado pelo script para localizar esta fonte.
        </p>
      </div>


      {/* SCRIPT */}

      <div className="border-b border-white/[0.05] p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Code2
            size={14}
            className="text-zinc-600"
          />

          <p className="text-xs font-medium text-zinc-400">
            Script de instalação
          </p>
        </div>


        <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/30 p-4">
          <code className="break-all font-mono text-xs leading-6 text-zinc-400">
            {
              installation
                ?.script
            }
          </code>
        </div>


        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const script =
                installation
                  ?.script

              if (script) {
                void copyValue(
                  'script',
                  script
                )
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.05]"
          >
            {copied ===
            'script' ? (
              <>
                <Check
                  size={14}
                />

                Copiado
              </>
            ) : (
              <>
                <Clipboard
                  size={14}
                />

                Copiar script
              </>
            )}
          </button>


          {installation
            ?.scriptUrl && (
            <a
              href={
                installation
                  .scriptUrl
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.07] px-3.5 py-2 text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              <ExternalLink
                size={14}
              />

              Ver arquivo JS
            </a>
          )}
        </div>


        <p className="mt-3 text-[10px] leading-4 text-zinc-700">
          O script deve ser carregado uma única vez na página. Ele registra page views, cria visitante e sessão, preserva UTMs e prepara a atribuição do checkout.
        </p>
      </div>


      {/* EVENTOS */}

      <div className="p-5 md:p-6">
        <p className="text-xs font-medium text-zinc-400">
          Eventos suportados
        </p>


        <div className="mt-3 flex flex-wrap gap-2">
          {(
            installation
              ?.supportedEvents ??
            []
          ).map(
            (
              eventName
            ) => (
              <span
                key={
                  eventName
                }
                className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 font-mono text-[10px] text-zinc-500"
              >
                {
                  eventName
                }
              </span>
            )
          )}
        </div>


        <p className="mt-3 text-[10px] leading-4 text-zinc-700">
          <strong className="font-medium text-zinc-600">
            page_view
          </strong>{' '}
          é enviado automaticamente.{' '}
          <strong className="font-medium text-zinc-600">
            initiate_checkout
          </strong>{' '}
          é disparado nos links preparados para checkout.{' '}
          <strong className="font-medium text-zinc-600">
            lead
          </strong>{' '}
          pode ser enviado pela API pública do script.
        </p>
      </div>
    </section>
  )
}