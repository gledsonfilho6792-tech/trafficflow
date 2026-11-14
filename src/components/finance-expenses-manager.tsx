'use client'

import { deferEffect } from '@/lib/defer-effect'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  AlertTriangle,
  CirclePlus,
  Loader2,
  Pencil,
  ReceiptText,
  Trash2,
  X,
} from 'lucide-react'


type Expense = {
  id: string

  project_id: string

  category: string

  name: string

  description:
    string | null

  amount_brl:
    number | string

  occurred_on: string

  source: string

  provider:
    string | null

  external_ref:
    string | null

  created_at: string

  updated_at?: string
}


type Props = {
  projectId: string

  currency: string

  startDate: string

  endDate: string
}


const categoryLabels:
  Record<
    string,
    string
  > = {
    checkout_fee:
      'Taxa de checkout',

    tax:
      'Imposto',

    tool:
      'Ferramenta',

    operational:
      'Operacional',

    chargeback_fee:
      'Taxa de chargeback',

    refund_fee:
      'Taxa de reembolso',

    other:
      'Outro',
  }


function formatMoney(
  value:
    number | string,
  currency: string
) {
  const amount =
    Number(value)

  return new Intl.NumberFormat(
    'pt-BR',
    {
      style:
        'currency',

      currency:
        currency ||
        'BRL',
    }
  ).format(
    Number.isFinite(
      amount
    )
      ? amount
      : 0
  )
}


function formatDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value.split('-')

  if (
    !year ||
    !month ||
    !day
  ) {
    return value
  }

  return `${day}/${month}/${year}`
}


function todayLocal() {
  const date =
    new Date()

  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      '0'
    )

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    )

  return `${year}-${month}-${day}`
}


function parseMoneyInput(
  value: string
) {
  const cleaned =
    value
      .replace(
        /\s/g,
        ''
      )
      .replace(
        /R\$/gi,
        ''
      )


  /*
   * Entrada brasileira:
   * 1.234,56
   */

  if (
    cleaned.includes(
      ','
    )
  ) {
    return Number(
      cleaned
        .replace(
          /\./g,
          ''
        )
        .replace(
          ',',
          '.'
        )
    )
  }


  /*
   * Entrada simples:
   * 1234.56
   */

  return Number(
    cleaned
  )
}


function moneyToInput(
  value:
    number | string
) {
  const amount =
    Number(value)

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return ''
  }

  return amount.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  )
}


export default function FinanceExpensesManager({
  projectId,
  currency,
  startDate,
  endDate,
}: Props) {
  const [
    expenses,
    setExpenses,
  ] =
    useState<
      Expense[]
    >([])


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    showForm,
    setShowForm,
  ] =
    useState(
      false
    )


  const [
    editingExpense,
    setEditingExpense,
  ] =
    useState<
      Expense | null
    >(
      null
    )


  const [
    expenseToDelete,
    setExpenseToDelete,
  ] =
    useState<
      Expense | null
    >(
      null
    )


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    )


  const [
    deleting,
    setDeleting,
  ] =
    useState(
      false
    )


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    )


  const [
    category,
    setCategory,
  ] =
    useState(
      'tool'
    )


  const [
    name,
    setName,
  ] =
    useState(
      ''
    )


  const [
    amount,
    setAmount,
  ] =
    useState(
      ''
    )


  const [
    occurredOn,
    setOccurredOn,
  ] =
    useState(
      todayLocal()
    )


  const [
    description,
    setDescription,
  ] =
    useState(
      ''
    )


  const loadExpenses =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          )

          setError(
            null
          )


          const params =
            new URLSearchParams({
              projectId,

              startDate,

              endDate,
            })


          const response =
            await fetch(
              `/api/finance/expenses?${params.toString()}`,
              {
                cache:
                  'no-store',
              }
            )


          const data =
            await response.json()


          if (
            !response.ok ||
            !data.ok
          ) {
            throw new Error(
              data.error ??
              'Não foi possível carregar os custos.'
            )
          }


          setExpenses(
            Array.isArray(
              data.expenses
            )
              ? data.expenses
              : []
          )
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Erro ao carregar custos.'
          )
        } finally {
          setLoading(
            false
          )
        }
      },
      [
        projectId,
        startDate,
        endDate,
      ]
    )


  useEffect(
    () => deferEffect(() => {
      void loadExpenses()
    }),
    [
      loadExpenses,
    ]
  )


  function resetForm() {
    setEditingExpense(
      null
    )

    setCategory(
      'tool'
    )

    setName(
      ''
    )

    setAmount(
      ''
    )

    setOccurredOn(
      todayLocal()
    )

    setDescription(
      ''
    )

    setError(
      null
    )
  }


  function openCreateForm() {
    resetForm()

    setShowForm(
      true
    )
  }


  function openEditForm(
    expense: Expense
  ) {
    if (
      expense.source !==
      'manual'
    ) {
      return
    }


    setError(
      null
    )

    setEditingExpense(
      expense
    )

    setCategory(
      expense.category
    )

    setName(
      expense.name
    )

    setAmount(
      moneyToInput(
        expense.amount_brl
      )
    )

    setOccurredOn(
      expense.occurred_on
    )

    setDescription(
      expense.description ??
      ''
    )

    setShowForm(
      true
    )


    window.setTimeout(
      () => {
        document
          .getElementById(
            'finance-expense-form'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'center',
          })
      },
      50
    )
  }


  function closeForm() {
    setShowForm(
      false
    )

    resetForm()
  }


  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()


    try {
      setSaving(
        true
      )

      setError(
        null
      )


      const normalizedAmount =
        parseMoneyInput(
          amount
        )


      if (
        !name.trim()
      ) {
        throw new Error(
          'Informe o nome do custo.'
        )
      }


      if (
        !Number.isFinite(
          normalizedAmount
        ) ||
        normalizedAmount <=
          0
      ) {
        throw new Error(
          'Informe um valor válido.'
        )
      }


      const isEditing =
        editingExpense !==
        null


      const endpoint =
        isEditing
          ? `/api/finance/expenses/${editingExpense.id}`
          : '/api/finance/expenses'


      const response =
        await fetch(
          endpoint,
          {
            method:
              isEditing
                ? 'PATCH'
                : 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                projectId,

                category,

                name:
                  name.trim(),

                amount:
                  normalizedAmount,

                occurredOn,

                description:
                  description.trim() ||
                  null,
              }),
          }
        )


      const data =
        await response.json()


      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ??
          (
            isEditing
              ? 'Não foi possível editar o custo.'
              : 'Não foi possível salvar o custo.'
          )
        )
      }


      closeForm()


      /*
       * Recarrega a página para atualizar:
       *
       * - lista de custos
       * - total de custos
       * - resultado conhecido
       * - ROI
       * - margem
       */

      window.location.reload()
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Erro ao salvar custo.'
      )
    } finally {
      setSaving(
        false
      )
    }
  }


  async function handleDelete() {
    if (
      !expenseToDelete
    ) {
      return
    }


    try {
      setDeleting(
        true
      )

      setError(
        null
      )


      const params =
        new URLSearchParams({
          projectId,
        })


      const response =
        await fetch(
          `/api/finance/expenses/${expenseToDelete.id}?${params.toString()}`,
          {
            method:
              'DELETE',
          }
        )


      const data =
        await response.json()


      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ??
          'Não foi possível excluir o custo.'
        )
      }


      setExpenseToDelete(
        null
      )


      window.location.reload()
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erro ao excluir custo.'
      )

      setExpenseToDelete(
        null
      )
    } finally {
      setDeleting(
        false
      )
    }
  }


  return (
    <>
      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f13]">

        {/* =============================================
            CABEÇALHO
        ============================================== */}

        <div className="flex flex-col gap-4 border-b border-white/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Gestão financeira
            </p>

            <h2 className="mt-1 text-sm font-semibold text-zinc-200">
              Lançamentos de custos
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              Cadastre e gerencie despesas conhecidas da operação.
            </p>
          </div>


          <button
            type="button"
            onClick={
              openCreateForm
            }
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-black transition hover:bg-emerald-400"
          >
            <CirclePlus
              size={15}
            />

            Adicionar custo
          </button>
        </div>


        {/* =============================================
            FORMULÁRIO
        ============================================== */}

        {showForm && (
          <div
            id="finance-expense-form"
            className="border-b border-white/[0.05] bg-white/[0.012] p-5 md:p-6"
          >

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  {editingExpense
                    ? 'Editar custo'
                    : 'Novo custo'}
                </h3>

                <p className="mt-1 text-xs text-zinc-600">
                  {editingExpense
                    ? 'Altere as informações do lançamento manual.'
                    : 'O valor será incluído no resultado operacional conhecido.'}
                </p>
              </div>


              <button
                type="button"
                onClick={
                  closeForm
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
              >
                <X
                  size={15}
                />
              </button>
            </div>


            <form
              onSubmit={
                handleSubmit
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

                <label className="block">

                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                    Categoria
                  </span>


                  <select
                    value={
                      category
                    }
                    onChange={(
                      event
                    ) =>
                      setCategory(
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-white/[0.07] bg-[#090b0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-emerald-500/40"
                  >
                    <option value="checkout_fee">
                      Taxa de checkout
                    </option>

                    <option value="tax">
                      Imposto
                    </option>

                    <option value="tool">
                      Ferramenta
                    </option>

                    <option value="operational">
                      Operacional
                    </option>

                    <option value="chargeback_fee">
                      Taxa de chargeback
                    </option>

                    <option value="refund_fee">
                      Taxa de reembolso
                    </option>

                    <option value="other">
                      Outro
                    </option>
                  </select>
                </label>


                <label className="block">

                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                    Nome
                  </span>


                  <input
                    type="text"
                    value={
                      name
                    }
                    onChange={(
                      event
                    ) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Ex.: Canva Pro"
                    maxLength={
                      120
                    }
                    className="h-10 w-full rounded-lg border border-white/[0.07] bg-[#090b0e] px-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-800 transition focus:border-emerald-500/40"
                  />
                </label>


                <label className="block">

                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                    Valor
                  </span>


                  <div className="relative">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
                      R$
                    </span>


                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        amount
                      }
                      onChange={(
                        event
                      ) =>
                        setAmount(
                          event.target.value
                        )
                      }
                      placeholder="0,00"
                      className="h-10 w-full rounded-lg border border-white/[0.07] bg-[#090b0e] pl-9 pr-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-800 transition focus:border-emerald-500/40"
                    />
                  </div>
                </label>


                <label className="block">

                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                    Data
                  </span>


                  <input
                    type="date"
                    value={
                      occurredOn
                    }
                    onChange={(
                      event
                    ) =>
                      setOccurredOn(
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-white/[0.07] bg-[#090b0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-emerald-500/40"
                  />
                </label>
              </div>


              <label className="mt-4 block">

                <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600">
                  Descrição
                </span>


                <textarea
                  value={
                    description
                  }
                  onChange={(
                    event
                  ) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Opcional"
                  rows={
                    3
                  }
                  className="w-full resize-none rounded-lg border border-white/[0.07] bg-[#090b0e] px-3 py-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-800 transition focus:border-emerald-500/40"
                />
              </label>


              {error && (
                <div className="mt-4 rounded-lg border border-red-500/10 bg-red-500/[0.04] px-4 py-3">

                  <p className="text-xs text-red-400">
                    {error}
                  </p>
                </div>
              )}


              <div className="mt-5 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                  className="h-9 rounded-lg border border-white/[0.07] px-4 text-xs font-medium text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-300 disabled:opacity-50"
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? 'Salvando...'
                    : editingExpense
                      ? 'Salvar alterações'
                      : 'Salvar custo'}
                </button>
              </div>
            </form>
          </div>
        )}


        {/* =============================================
            ERRO FORA DO FORM
        ============================================== */}

        {!showForm &&
          error && (
          <div className="border-b border-white/[0.05] px-5 py-4 md:px-6">

            <div className="rounded-lg border border-red-500/10 bg-red-500/[0.04] px-4 py-3">

              <p className="text-xs text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}


        {/* =============================================
            LISTAGEM
        ============================================== */}

        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center">

            <Loader2
              size={18}
              className="animate-spin text-zinc-600"
            />
          </div>
        ) : expenses.length ===
          0 ? (
          <div className="flex min-h-[190px] items-center justify-center p-6">

            <div className="text-center">

              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.02] text-zinc-700">

                <ReceiptText
                  size={16}
                />
              </div>


              <p className="mt-3 text-sm text-zinc-500">
                Nenhum custo cadastrado neste período.
              </p>

              <p className="mt-1 text-xs text-zinc-700">
                Use “Adicionar custo” para registrar a primeira despesa.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px]">

              <thead>

                <tr className="border-b border-white/[0.05]">

                  <TableHead>
                    Data
                  </TableHead>

                  <TableHead>
                    Categoria
                  </TableHead>

                  <TableHead>
                    Nome
                  </TableHead>

                  <TableHead>
                    Descrição
                  </TableHead>

                  <TableHead
                    align="right"
                  >
                    Valor
                  </TableHead>

                  <TableHead>
                    Origem
                  </TableHead>

                  <TableHead
                    align="right"
                  >
                    Ações
                  </TableHead>
                </tr>

              </thead>


              <tbody>

                {expenses.map(
                  (
                    expense
                  ) => {
                    const manual =
                      expense.source ===
                      'manual'


                    return (
                      <tr
                        key={
                          expense.id
                        }
                        className="border-b border-white/[0.035] last:border-0 hover:bg-white/[0.012]"
                      >

                        <td className="whitespace-nowrap px-5 py-4 text-xs text-zinc-500 md:px-6">
                          {formatDate(
                            expense.occurred_on
                          )}
                        </td>


                        <td className="px-4 py-4">

                          <span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.06em] text-zinc-500">

                            {categoryLabels[
                              expense.category
                            ] ??
                              expense.category}

                          </span>
                        </td>


                        <td className="px-4 py-4 text-xs font-medium text-zinc-300">
                          {expense.name}
                        </td>


                        <td className="max-w-[300px] px-4 py-4 text-xs text-zinc-600">

                          <p className="truncate">
                            {expense.description ??
                              '—'}
                          </p>
                        </td>


                        <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-semibold text-zinc-300">
                          {formatMoney(
                            expense.amount_brl,
                            currency
                          )}
                        </td>


                        <td className="px-4 py-4 text-xs text-zinc-600">

                          {manual
                            ? 'Manual'
                            : expense.provider
                              ? `Automático · ${expense.provider}`
                              : 'Automático'}

                        </td>


                        <td className="px-5 py-4 md:px-6">

                          <div className="flex justify-end gap-2">

                            {manual ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditForm(
                                      expense
                                    )
                                  }
                                  title="Editar custo"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-600 transition hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-zinc-200"
                                >
                                  <Pencil
                                    size={13}
                                  />
                                </button>


                                <button
                                  type="button"
                                  onClick={() => {
                                    setError(
                                      null
                                    )

                                    setExpenseToDelete(
                                      expense
                                    )
                                  }}
                                  title="Excluir custo"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/10 text-zinc-600 transition hover:border-red-500/20 hover:bg-red-500/[0.05] hover:text-red-400"
                                >
                                  <Trash2
                                    size={13}
                                  />
                                </button>
                              </>
                            ) : (
                              <span className="text-[9px] text-zinc-700">
                                Gerenciado automaticamente
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }
                )}

              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* ===============================================
          CONFIRMAÇÃO DE EXCLUSÃO
      ================================================ */}

      {expenseToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0f13] shadow-2xl">

            <div className="p-6">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/10 bg-red-500/[0.05] text-red-400">

                <AlertTriangle
                  size={18}
                />
              </div>


              <h3 className="mt-4 text-base font-semibold text-zinc-200">
                Excluir custo?
              </h3>


              <p className="mt-2 text-xs leading-5 text-zinc-500">
                O lançamento{' '}
                <span className="font-medium text-zinc-300">
                  {expenseToDelete.name}
                </span>{' '}
                no valor de{' '}
                <span className="font-medium text-zinc-300">
                  {formatMoney(
                    expenseToDelete.amount_brl,
                    currency
                  )}
                </span>{' '}
                será removido permanentemente.
              </p>


              <p className="mt-2 text-[10px] leading-5 text-zinc-700">
                O resultado financeiro do período será recalculado após a exclusão.
              </p>
            </div>


            <div className="flex justify-end gap-3 border-t border-white/[0.05] px-6 py-4">

              <button
                type="button"
                disabled={
                  deleting
                }
                onClick={() =>
                  setExpenseToDelete(
                    null
                  )
                }
                className="h-9 rounded-lg border border-white/[0.07] px-4 text-xs font-medium text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-300 disabled:opacity-50"
              >
                Cancelar
              </button>


              <button
                type="button"
                disabled={
                  deleting
                }
                onClick={() =>
                  void handleDelete()
                }
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 text-xs font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2
                    size={14}
                  />
                )}

                {deleting
                  ? 'Excluindo...'
                  : 'Excluir custo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


function TableHead({
  children,
  align =
    'left',
}: {
  children:
    React.ReactNode

  align?:
    | 'left'
    | 'right'
}) {
  return (
    <th
      className={`px-4 py-3 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600 ${
        align ===
        'right'
          ? 'text-right'
          : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}