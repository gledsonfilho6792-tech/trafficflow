'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  RefreshCw,
  XCircle,
} from 'lucide-react'

type Props = {
  projectId: string
}

type SyncResult = {
  ok?: boolean

  account?: {
    id?: string
    name?: string
  }

  imported?: {
    campaigns?: number
    adSets?: number
    ads?: number
  }

  error?: string
  details?: string
}

export default function MetaSyncButton({
  projectId,
}: Props) {
  const router = useRouter()

  const [loading, setLoading] =
    useState(false)

  const [result, setResult] =
    useState<SyncResult | null>(null)

  async function syncMeta() {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(
        '/api/integrations/meta/sync',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            projectId,
          }),
        }
      )

      const data: SyncResult =
        await response.json()

      setResult(data)

      if (response.ok && data.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error(
        'META SYNC REQUEST ERROR:',
        error
      )

      setResult({
        ok: false,
        error:
          'Não foi possível iniciar a sincronização.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={syncMeta}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw
          size={16}
          className={
            loading
              ? 'animate-spin'
              : ''
          }
        />

        {loading
          ? 'Sincronizando...'
          : 'Sincronizar Meta'}
      </button>

      {result?.ok && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <CheckCircle2 size={16} />

            Sincronização concluída
          </div>

          <div className="mt-3 grid gap-3 text-xs text-zinc-400 sm:grid-cols-3">
            <div>
              <p className="text-zinc-600">
                Campanhas
              </p>

              <p className="mt-1 text-sm text-zinc-300">
                {result.imported?.campaigns ??
                  0}
              </p>
            </div>

            <div>
              <p className="text-zinc-600">
                Conjuntos
              </p>

              <p className="mt-1 text-sm text-zinc-300">
                {result.imported?.adSets ??
                  0}
              </p>
            </div>

            <div>
              <p className="text-zinc-600">
                Anúncios
              </p>

              <p className="mt-1 text-sm text-zinc-300">
                {result.imported?.ads ??
                  0}
              </p>
            </div>
          </div>
        </div>
      )}

      {result && result.ok === false && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-red-300">
            <XCircle size={16} />

            Erro na sincronização
          </div>

          <p className="mt-2 text-xs leading-5 text-red-300/80">
            {result.details ||
              result.error ||
              'Ocorreu um erro inesperado.'}
          </p>
        </div>
      )}
    </div>
  )
}