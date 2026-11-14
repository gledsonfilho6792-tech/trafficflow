'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  ExternalLink,
  FlaskConical,
  RefreshCw,
} from 'lucide-react'


type ContextResponse = {
  ok: boolean

  error?: string

  source?: {
    id: string
    name: string
    domain: string | null
    publicKey: string
  }

  meta?: {
    campaign: {
      id: string
      externalId: string
      name: string
    }

    adSet: {
      id: string
      externalId: string
      name: string
    }

    ad: {
      id: string
      externalId: string
      name: string
    }
  }

  testUrl?: string
}


type Props = {
  projectId: string
}


export default function TrackingE2ETest({
  projectId,
}: Props) {
  const [
    data,
    setData,
  ] =
    useState<
      ContextResponse | null
    >(null)


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)


  const loadContext =
    useCallback(
      async () => {
        setLoading(true)
        setError(null)


        try {
          const response =
            await fetch(
              `/api/tracking/e2e-context?projectId=${projectId}`,
              {
                cache:
                  'no-store',
              }
            )


          const result:
            ContextResponse =
            await response.json()


          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                'Não foi possível preparar o teste.'
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
        }
      },
      [
        projectId,
      ]
    )


  useEffect(() => deferEffect(() => {
    void loadContext()
  }), [
    loadContext,
  ])


  return (
    <section className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

      <div className="flex flex-col gap-4 border-b border-white/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-zinc-400">
            <FlaskConical
              size={18}
            />
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Diagnóstico
            </p>

            <h2 className="mt-1 text-sm font-semibold text-zinc-200">
              Teste controlado E2E
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Valida tracking e atribuição usando entidades Meta reais, sem utilizar a PV.
            </p>
          </div>
        </div>


        <button
          type="button"
          onClick={
            loadContext
          }
          disabled={
            loading
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-zinc-500"
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? 'animate-spin'
                : ''
            }
          />
        </button>
      </div>


      {error ? (
        <div className="p-5 md:p-6">
          <p className="text-xs text-red-400">
            {error}
          </p>
        </div>
      ) : loading ? (
        <div className="p-6 text-xs text-zinc-600">
          Preparando contexto...
        </div>
      ) : data?.meta &&
        data.testUrl ? (
        <>
          <div className="grid gap-px bg-white/[0.05] sm:grid-cols-3">

            <TestEntity
              title="Campanha"
              name={
                data.meta
                  .campaign
                  .name
              }
              externalId={
                data.meta
                  .campaign
                  .externalId
              }
            />

            <TestEntity
              title="Conjunto"
              name={
                data.meta
                  .adSet
                  .name
              }
              externalId={
                data.meta
                  .adSet
                  .externalId
              }
            />

            <TestEntity
              title="Anúncio"
              name={
                data.meta
                  .ad
                  .name
              }
              externalId={
                data.meta
                  .ad
                  .externalId
              }
            />
          </div>


          <div className="p-5 md:p-6">
            <p className="text-xs text-zinc-500">
              Este teste criará uma sessão de diagnóstico e eventos de teste no banco.
            </p>

            <p className="mt-1 text-[10px] text-zinc-700">
              Nenhum pedido ou venda será criado nesta etapa.
            </p>


            <a
              href={
                data.testUrl
              }
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-zinc-200"
            >
              <ExternalLink
                size={14}
              />

              Executar teste controlado
            </a>
          </div>
        </>
      ) : null}
    </section>
  )
}


function TestEntity({
  title,
  name,
  externalId,
}: {
  title: string
  name: string
  externalId: string
}) {
  return (
    <div className="bg-[#0d0f13] p-5 md:p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
        {title}
      </p>

      <p className="mt-2 truncate text-xs font-medium text-zinc-300">
        {name}
      </p>

      <p className="mt-1 truncate font-mono text-[9px] text-zinc-700">
        {externalId}
      </p>
    </div>
  )
}