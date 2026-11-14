'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Loader2,
  Megaphone,
} from 'lucide-react'

type MetaAdAccount = {
  id: string
  account_id?: string
  name?: string
  account_status?: number
  currency?: string
  timezone_name?: string
}

type Props = {
  projectId: string
  integrationId: string
  currentExternalAccountId?: string | null
  accounts: MetaAdAccount[]
}

export default function MetaAccountSelector({
  projectId,
  integrationId,
  currentExternalAccountId,
  accounts,
}: Props) {
  const router = useRouter()

  const [selectedId, setSelectedId] =
    useState<string | null>(
      currentExternalAccountId ?? null
    )

  const [savingId, setSavingId] =
    useState<string | null>(null)

  const [message, setMessage] =
    useState('')

  const [hasError, setHasError] =
    useState(false)

  async function selectAccount(
    account: MetaAdAccount
  ) {
    setSavingId(account.id)
    setMessage('')
    setHasError(false)

    try {
      const response = await fetch(
        '/api/integrations/meta/select-account',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            projectId,
            integrationId,
            account,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.ok) {
        console.error(
          'SELECT META ACCOUNT ERROR:',
          result
        )

        setHasError(true)

        setMessage(
          result.details ||
            result.error ||
            'Não foi possível selecionar a conta.'
        )

        return
      }

      setSelectedId(account.id)

      setMessage(
        `${account.name ?? 'Conta Meta Ads'} conectada ao projeto.`
      )

      /*
       * Atualiza os dados vindos do servidor,
       * inclusive status da integração.
       */
      router.refresh()
    } catch (error) {
      console.error(
        'SELECT META ACCOUNT ERROR:',
        error
      )

      setHasError(true)

      setMessage(
        'Erro inesperado ao conectar a conta.'
      )
    } finally {
      setSavingId(null)
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
        <p className="text-sm font-medium text-amber-300">
          Nenhuma conta de anúncios encontrada
        </p>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          A conta Meta autorizada não retornou
          contas de anúncios disponíveis.
        </p>
      </div>
    )
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
            hasError
              ? 'border-red-500/20 bg-red-500/[0.06] text-red-300'
              : 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {accounts.map((account) => {
          const selected =
            selectedId === account.id

          const saving =
            savingId === account.id

          return (
            <button
              key={account.id}
              type="button"
              onClick={() =>
                selectAccount(account)
              }
              disabled={Boolean(savingId)}
              className={`rounded-2xl border p-5 text-left transition ${
                selected
                  ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                  : 'border-white/[0.06] bg-[#0d0f13] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400">
                  <Megaphone size={18} />
                </div>

                {saving ? (
                  <Loader2
                    size={18}
                    className="animate-spin text-emerald-400"
                  />
                ) : selected ? (
                  <CheckCircle2
                    size={18}
                    className="text-emerald-400"
                  />
                ) : null}
              </div>

              <h3 className="mt-4 text-sm font-semibold text-zinc-200">
                {account.name ??
                  'Conta Meta Ads'}
              </h3>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600">
                    Account ID
                  </span>

                  <span className="text-zinc-400">
                    {account.account_id ??
                      account.id}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600">
                    Moeda
                  </span>

                  <span className="text-zinc-400">
                    {account.currency ?? '—'}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600">
                    Fuso horário
                  </span>

                  <span className="text-zinc-400">
                    {account.timezone_name ??
                      '—'}
                  </span>
                </div>
              </div>

              <div className="mt-5 border-t border-white/[0.05] pt-4 text-xs font-medium">
                {selected ? (
                  <span className="text-emerald-400">
                    Conta ativa
                  </span>
                ) : saving ? (
                  <span className="text-zinc-500">
                    Conectando...
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    Selecionar esta conta
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}