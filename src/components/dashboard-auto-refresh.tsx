'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  useEffect,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  RefreshCw,
} from 'lucide-react'

type Props = {
  lastSyncedAt?: string | null
}

function formatElapsed(
  dateString?: string | null
) {
  if (!dateString) {
    return 'aguardando primeira atualização'
  }

  const difference =
    Date.now() -
    new Date(
      dateString
    ).getTime()

  const seconds =
    Math.max(
      0,
      Math.floor(
        difference / 1000
      )
    )

  if (seconds < 60) {
    return `há ${seconds}s`
  }

  const minutes =
    Math.floor(
      seconds / 60
    )

  if (minutes < 60) {
    return `há ${minutes} min`
  }

  const hours =
    Math.floor(
      minutes / 60
    )

  return `há ${hours}h`
}

export default function DashboardAutoRefresh({
  lastSyncedAt,
}: Props) {
  const router =
    useRouter()

  /*
   * IMPORTANTE:
   * Não calculamos Date.now()
   * durante o primeiro render.
   *
   * Isso evita hydration mismatch
   * entre servidor e navegador.
   */
  const [
    elapsed,
    setElapsed,
  ] = useState(
    'carregando...'
  )

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  useEffect(() => {
    /*
     * Primeiro cálculo acontece
     * somente no navegador.
     */
    const cancelInitialClock = deferEffect(() => setElapsed(formatElapsed(lastSyncedAt)))

    const clock =
      window.setInterval(
        () => {
          setElapsed(
            formatElapsed(
              lastSyncedAt
            )
          )
        },
        1000
      )

    /*
     * Relê o Supabase a cada 15s.
     * Não consulta a Meta diretamente.
     */
    const refresh =
      window.setInterval(
        () => {
          if (
            document.visibilityState !==
            'visible'
          ) {
            return
          }

          setRefreshing(true)

          router.refresh()

          window.setTimeout(
            () => {
              setRefreshing(false)
            },
            600
          )
        },
        15000
      )

    return () => {
      cancelInitialClock()
      window.clearInterval(
        clock
      )

      window.clearInterval(
        refresh
      )
    }
  }, [
    router,
    lastSyncedAt,
  ])

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-2 text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />

          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>

        Atualização automática
      </div>

      <span className="text-zinc-700">
        •
      </span>

      <span className="text-zinc-500">
        Meta atualizada{' '}
        {elapsed}
      </span>

      {refreshing && (
        <RefreshCw
          size={12}
          className="animate-spin text-zinc-600"
        />
      )}
    </div>
  )
}