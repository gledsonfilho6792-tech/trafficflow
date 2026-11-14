import {
  createAdminClient,
} from '@/lib/supabase/admin'

import {
  normalizeFinancialCosts,
} from './normalize'

import type {
  WebhookPayload,
  WebhookProvider,
} from './types'


type ProcessFinancialCostsParams = {
  projectId: string

  provider:
    WebhookProvider

  payload:
    WebhookPayload
}


function dateInTimezone(
  value: string | null,
  timezone: string
) {
  let date =
    value
      ? new Date(
          value
        )
      : new Date()


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    date =
      new Date()
  }


  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          timezone,

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    ).formatToParts(
      date
    )


  const year =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'year'
    )?.value


  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'month'
    )?.value


  const day =
    parts.find(
      (
        part
      ) =>
        part.type ===
        'day'
    )?.value


  if (
    !year ||
    !month ||
    !day
  ) {
    return new Date()
      .toISOString()
      .slice(
        0,
        10
      )
  }


  return `${year}-${month}-${day}`
}


export async function processFinancialCosts({
  projectId,
  provider,
  payload,
}: ProcessFinancialCostsParams) {
  const costs =
    normalizeFinancialCosts(
      provider,
      payload
    )


  if (
    costs.length ===
    0
  ) {
    return {
      processed:
        0,

      skipped:
        0,
    }
  }


  const admin =
    createAdminClient()


  /*
   * =====================================================
   * PROJETO
   * =====================================================
   *
   * Precisamos do timezone para transformar
   * occurredAt em occurred_on corretamente.
   * =====================================================
   */

  const {
    data: project,

    error:
      projectError,
  } =
    await admin
      .from(
        'projects'
      )
      .select(
        `
        id,
        timezone,
        base_currency
        `
      )
      .eq(
        'id',
        projectId
      )
      .maybeSingle()


  if (
    projectError ||
    !project
  ) {
    throw new Error(
      projectError
        ?.message ??
      'Projeto não encontrado ao processar custos financeiros.'
    )
  }


  const timezone =
    project.timezone ||
    'UTC'


  const projectCurrency =
    String(
      project.base_currency ??
      'BRL'
    ).toUpperCase()


  let processed =
    0

  let skipped =
    0


  for (
    const cost
    of costs
  ) {
    /*
     * ===================================================
     * VALIDAÇÃO
     * ===================================================
     */

    if (
      !Number.isFinite(
        cost.amount
      ) ||
      cost.amount <=
        0
    ) {
      skipped +=
        1

      continue
    }


    const costCurrency =
      (
        cost.currency ??
        projectCurrency
      ).toUpperCase()


    /*
     * finance_expenses atualmente usa amount_brl.
     *
     * Portanto NÃO inventamos conversão.
     *
     * Quando criarmos o motor FX para custos,
     * moedas estrangeiras poderão entrar aqui.
     */

    if (
      costCurrency !==
      'BRL'
    ) {
      console.warn(
        'FINANCIAL COST SKIPPED — unsupported currency:',
        {
          provider,

          projectId,

          externalRef:
            cost.externalRef,

          currency:
            costCurrency,

          amount:
            cost.amount,
        }
      )


      skipped +=
        1

      continue
    }


    const occurredOn =
      dateInTimezone(
        cost.occurredAt,
        timezone
      )


    /*
     * ===================================================
     * REGISTRO EXISTENTE
     * ===================================================
     *
     * CHARGEBACK_CREATED e CHARGEBACK_UPDATED podem
     * apontar para a mesma multa.
     *
     * external_ref é nossa chave idempotente.
     * ===================================================
     */

    const {
      data:
        existingExpense,

      error:
        findError,
    } =
      await admin
        .from(
          'finance_expenses'
        )
        .select(
          'id'
        )
        .eq(
          'project_id',
          projectId
        )
        .eq(
          'source',
          'provider'
        )
        .eq(
          'provider',
          provider
        )
        .eq(
          'external_ref',
          cost.externalRef
        )
        .maybeSingle()


    if (
      findError
    ) {
      throw new Error(
        findError.message
      )
    }


    const expenseData = {
      project_id:
        projectId,

      category:
        cost.category,

      name:
        cost.name,

      description:
        cost.description,

      amount_brl:
        cost.amount,

      occurred_on:
        occurredOn,

      source:
        'provider',

      provider,

      external_ref:
        cost.externalRef,

      metadata: {
        ...cost.metadata,

        normalized_currency:
          costCurrency,

        normalized_amount:
          cost.amount,

        occurred_at:
          cost.occurredAt,
      },
    }


    /*
     * ===================================================
     * UPDATE
     * ===================================================
     *
     * Se CHARGEBACK_UPDATED alterar o valor da multa,
     * atualizamos o mesmo lançamento ao invés de criar
     * outro.
     * ===================================================
     */

    if (
      existingExpense
    ) {
      const {
        error:
          updateError,
      } =
        await admin
          .from(
            'finance_expenses'
          )
          .update({
            category:
              expenseData.category,

            name:
              expenseData.name,

            description:
              expenseData.description,

            amount_brl:
              expenseData.amount_brl,

            occurred_on:
              expenseData.occurred_on,

            metadata:
              expenseData.metadata,
          })
          .eq(
            'id',
            existingExpense.id
          )


      if (
        updateError
      ) {
        throw new Error(
          updateError.message
        )
      }


      processed +=
        1

      continue
    }


    /*
     * ===================================================
     * INSERT
     * ===================================================
     */

    const {
      error:
        insertError,
    } =
      await admin
        .from(
          'finance_expenses'
        )
        .insert(
          expenseData
        )


    /*
     * 23505:
     *
     * Outra execução concorrente pode ter criado
     * exatamente o mesmo custo entre nosso SELECT
     * e INSERT.
     *
     * Nesse caso fazemos UPDATE e seguimos.
     */

    if (
      insertError?.code ===
      '23505'
    ) {
      const {
        error:
          retryError,
      } =
        await admin
          .from(
            'finance_expenses'
          )
          .update({
            category:
              expenseData.category,

            name:
              expenseData.name,

            description:
              expenseData.description,

            amount_brl:
              expenseData.amount_brl,

            occurred_on:
              expenseData.occurred_on,

            metadata:
              expenseData.metadata,
          })
          .eq(
            'project_id',
            projectId
          )
          .eq(
            'source',
            'provider'
          )
          .eq(
            'provider',
            provider
          )
          .eq(
            'external_ref',
            cost.externalRef
          )


      if (
        retryError
      ) {
        throw new Error(
          retryError.message
        )
      }


      processed +=
        1

      continue
    }


    if (
      insertError
    ) {
      throw new Error(
        insertError.message
      )
    }


    processed +=
      1
  }


  return {
    processed,

    skipped,
  }
}