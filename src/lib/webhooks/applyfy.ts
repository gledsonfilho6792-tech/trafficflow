import type {
  NormalizedDispute,
  NormalizedFinancialCost,
  NormalizedOrder,
  NormalizedOrderItem,
  NormalizedOrderStatus,
  NormalizedWebhookMetadata,
  WebhookPayload,
} from './types'


function asRecord(
  value: unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as Record<
    string,
    unknown
  >
}


function getString(
  value: unknown
): string | null {
  return typeof value === 'string' &&
    value.trim().length > 0
    ? value.trim()
    : null
}


function getNumber(
  value: unknown
): number | null {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value
  }

  if (
    typeof value === 'string' &&
    value.trim() !== ''
  ) {
    const parsed =
      Number(value)

    return Number.isFinite(parsed)
      ? parsed
      : null
  }

  return null
}


function getInteger(
  value: unknown
): number | null {
  const number =
    getNumber(value)

  return number !== null
    ? Math.trunc(number)
    : null
}


function getQueryParam(
  url: string | null,
  name: string
): string | null {
  if (!url) {
    return null
  }

  try {
    return (
      new URL(url)
        .searchParams
        .get(name)
    )
  } catch {
    return null
  }
}


function firstString(
  ...values: unknown[]
): string | null {
  for (
    const value of values
  ) {
    const parsed =
      getString(value)

    if (parsed) {
      return parsed
    }
  }

  return null
}


function firstQueryParam(
  url: string | null,
  ...names: string[]
): string | null {
  for (
    const name of names
  ) {
    const value =
      getQueryParam(
        url,
        name
      )

    if (value) {
      return value
    }
  }

  return null
}


function getOrderStatus(
  eventType: string | null
): NormalizedOrderStatus | null {
  switch (eventType) {
    case 'TRANSACTION_CREATED':
      return 'pending'

    case 'TRANSACTION_PAID':
      return 'paid'

    case 'TRANSACTION_CANCELED':
      return 'canceled'

    case 'TRANSACTION_REFUNDED':
      return 'refunded'

    default:
      return null
  }
}


/*
 * =========================================================
 * METADADOS DO WEBHOOK
 * =========================================================
 */

export function normalizeApplyfyWebhook(
  payload: WebhookPayload
): NormalizedWebhookMetadata {
  const eventType =
    getString(
      payload.event
    )

  const transaction =
    asRecord(
      payload.transaction
    )

  const chargeback =
    asRecord(
      payload.chargeback
    )

  const transactionId =
    transaction
      ? getString(
          transaction.id
        )
      : null

  const orderId =
    getString(
      payload.orderId
    )

  const disputeId =
    chargeback
      ? getString(
          chargeback.id
        )
      : null

  const disputeUpdatedAt =
    chargeback
      ? getString(
          chargeback.updatedAt
        )
      : null


  if (
    eventType ===
      'CHARGEBACK_UPDATED' ||
    eventType ===
      'MED_UPDATED'
  ) {
    const externalEventId =
      disputeId
        ? [
            disputeId,
            disputeUpdatedAt ??
              'updated',
          ].join(':')
        : transactionId

    return {
      eventType,
      externalEventId,
    }
  }


  if (
    eventType ===
      'CHARGEBACK_CREATED' ||
    eventType ===
      'MED_CREATED'
  ) {
    return {
      eventType,

      externalEventId:
        disputeId ??
        transactionId,
    }
  }


  return {
    eventType,

    externalEventId:
      transactionId ??
      orderId,
  }
}


/*
 * =========================================================
 * PEDIDOS / TRANSAÇÕES
 * =========================================================
 */

export function normalizeApplyfyOrder(
  payload: WebhookPayload
): NormalizedOrder | null {
  const eventType =
    getString(
      payload.event
    )

  const status =
    getOrderStatus(
      eventType
    )

  if (
    !eventType ||
    !status
  ) {
    return null
  }


  const transaction =
    asRecord(
      payload.transaction
    )

  if (!transaction) {
    return null
  }


  const externalTransactionId =
    getString(
      transaction.id
    )

  const transactionIdentifier =
    getString(
      transaction.identifier
    )

  const externalOrderId =
    getString(
      payload.orderId
    ) ??
    externalTransactionId

  if (!externalOrderId) {
    return null
  }


  /*
   * =======================================================
   * CLIENTE
   * =======================================================
   */

  const client =
    asRecord(
      payload.client
    )

  const address =
    client
      ? asRecord(
          client.address
        )
      : null


  /*
   * =======================================================
   * TRACKING
   * =======================================================
   */

  const trackProps =
    asRecord(
      payload.trackProps
    )

  const checkoutUrl =
    getString(
      payload.checkoutUrl
    )


  /*
   * =======================================================
   * ASSINATURA
   * =======================================================
   */

  const subscription =
    asRecord(
      payload.subscription
    )


  /*
   * =======================================================
   * ITENS
   * =======================================================
   */

  const rawItems =
    Array.isArray(
      payload.orderItems
    )
      ? payload.orderItems
      : []


  const items:
    NormalizedOrderItem[] =
    rawItems
      .map((rawItem) => {
        const item =
          asRecord(
            rawItem
          )

        if (!item) {
          return null
        }

        const product =
          asRecord(
            item.product
          )

        const price =
          getNumber(
            item.price
          )

        return {
          externalItemId:
            getString(
              item.id
            ),

          externalProductId:
            product
              ? getString(
                  product.id
                )
              : null,

          externalProductReference:
            product
              ? getString(
                  product.externalId
                )
              : null,

          productName:
            product
              ? getString(
                  product.name
                )
              : null,

          quantity:
            1,

          unitPrice:
            price,

          totalAmount:
            price,
        }
      })
      .filter(
        (
          item
        ): item is NormalizedOrderItem =>
          item !== null
      )


  /*
   * =======================================================
   * UTMs
   *
   * Prioridade:
   *
   * 1. trackProps enviado pela Applyfy
   * 2. checkoutUrl
   * =======================================================
   */

  const utmSource =
    (
      trackProps
        ? firstString(
            trackProps.utm_source,
            trackProps.utmSource
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'utm_source'
    )


  const utmMedium =
    (
      trackProps
        ? firstString(
            trackProps.utm_medium,
            trackProps.utmMedium
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'utm_medium'
    )


  const utmCampaign =
    (
      trackProps
        ? firstString(
            trackProps.utm_campaign,
            trackProps.utmCampaign
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'utm_campaign'
    )


  const utmContent =
    (
      trackProps
        ? firstString(
            trackProps.utm_content,
            trackProps.utmContent
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'utm_content'
    )


  const utmTerm =
    (
      trackProps
        ? firstString(
            trackProps.utm_term,
            trackProps.utmTerm
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'utm_term'
    )


  /*
   * =======================================================
   * CLICK IDS
   * =======================================================
   */

  const fbclid =
    (
      trackProps
        ? firstString(
            trackProps.fbclid
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'fbclid'
    )


  const gclid =
    (
      trackProps
        ? firstString(
            trackProps.gclid
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'gclid'
    )


  const ttclid =
    (
      trackProps
        ? firstString(
            trackProps.ttclid
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'ttclid'
    )


  /*
   * =======================================================
   * IDENTIFICADORES TRAFFIC FLOW
   * =======================================================
   *
   * Novos nomes:
   *
   * tf_session_id
   * tf_visitor_id
   * tf_source_key
   * tf_fbp
   * tf_fbc
   *
   * Também mantemos compatibilidade
   * com nomes antigos.
   * =======================================================
   */

  const sessionId =
    (
      trackProps
        ? firstString(
            trackProps.tf_session_id,
            trackProps.session_id,
            trackProps.sessionId
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'tf_session_id',
      'session_id',
      'session'
    )


  const visitorId =
    (
      trackProps
        ? firstString(
            trackProps.tf_visitor_id,
            trackProps.visitor_id,
            trackProps.visitorId
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'tf_visitor_id',
      'visitor_id'
    )


  const sourceKey =
    (
      trackProps
        ? firstString(
            trackProps.tf_source_key,
            trackProps.source_key
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'tf_source_key',
      'source_key'
    )


  const fbp =
    (
      trackProps
        ? firstString(
            trackProps.tf_fbp,
            trackProps.fbp,
            trackProps._fbp
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'tf_fbp',
      'fbp'
    )


  const fbc =
    (
      trackProps
        ? firstString(
            trackProps.tf_fbc,
            trackProps.fbc,
            trackProps._fbc
          )
        : null
    ) ??
    firstQueryParam(
      checkoutUrl,
      'tf_fbc',
      'fbc'
    )


  /*
   * =======================================================
   * RESULTADO
   * =======================================================
   */

  return {
    eventType,

    externalOrderId,
    externalTransactionId,
    transactionIdentifier,

    status,

    currency:
      getString(
        transaction.currency
      ) ?? 'BRL',

    grossAmount:
      getNumber(
        transaction.amount
      ),

    /*
     * Ainda não assumimos que
     * commissionAmount seja receita líquida.
     */
    netAmount:
      null,

    chargeAmount:
      getNumber(
        transaction.chargeAmount
      ),

    commissionAmount:
      getNumber(
        transaction.commissionAmount
      ),

    originalAmount:
      getNumber(
        transaction.originalAmount
      ),

    originalCurrency:
      getString(
        transaction.originalCurrency
      ),

    exchangeRate:
      getNumber(
        transaction.exchangeRate
      ),

    paymentMethod:
      getString(
        transaction.paymentMethod
      ),

    installments:
      getInteger(
        transaction.installments
      ),

    offerCode:
      getString(
        payload.offerCode
      ),

    paidAt:
      getString(
        transaction.payedAt
      ),

    providerCreatedAt:
      getString(
        transaction.createdAt
      ),


    /*
     * CLIENTE
     */

    customerExternalId:
      client
        ? getString(
            client.id
          )
        : null,

    customerName:
      client
        ? getString(
            client.name
          )
        : null,

    customerEmail:
      client
        ? getString(
            client.email
          )
        : null,

    customerPhone:
      client
        ? getString(
            client.phone
          )
        : null,

    customerCountry:
      address
        ? getString(
            address.country
          )
        : null,

    customerState:
      address
        ? getString(
            address.state
          )
        : null,

    customerCity:
      address
        ? getString(
            address.city
          )
        : null,


    /*
     * ATRIBUIÇÃO
     */

    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,

    sessionId,
    visitorId,
    fbclid,


    /*
     * Dados complementares de tracking.
     *
     * São úteis para:
     *
     * Meta CAPI
     * Google
     * TikTok
     * diagnóstico
     * recuperação de atribuição
     */

    trackingData: {
      source_key:
        sourceKey,

      fbp,
      fbc,

      gclid,
      ttclid,

      checkout_url:
        checkoutUrl,

      ip:
        trackProps
          ? getString(
              trackProps.ip
            )
          : null,

      user_agent:
        trackProps
          ? getString(
              trackProps.user_agent
            )
          : null,
    },


    /*
     * ASSINATURA
     */

    subscriptionExternalId:
      subscription
        ? getString(
            subscription.id
          )
        : null,

    subscriptionStatus:
      subscription
        ? getString(
            subscription.status
          )
        : null,

    items,
  }
}


/*
 * =========================================================
 * CHARGEBACK / MED
 * =========================================================
 */

export function normalizeApplyfyDispute(
  payload: WebhookPayload
): NormalizedDispute | null {
  const eventType =
    getString(
      payload.event
    )

  const isChargeback =
    eventType ===
      'CHARGEBACK_CREATED' ||
    eventType ===
      'CHARGEBACK_UPDATED'

  const isMed =
    eventType ===
      'MED_CREATED' ||
    eventType ===
      'MED_UPDATED'


  if (
    !eventType ||
    (
      !isChargeback &&
      !isMed
    )
  ) {
    return null
  }

  const transaction =
    asRecord(
      payload.transaction
    )

  if (!transaction) {
    return null
  }


  const externalTransactionId =
    getString(
      transaction.id
    )

  if (
    !externalTransactionId
  ) {
    return null
  }


  const chargeback =
    asRecord(
      payload.chargeback
    )


  const createdAt =
    chargeback
      ? getString(
          chargeback.createdAt
        )
      : null


  const updatedAt =
    chargeback
      ? getString(
          chargeback.updatedAt
        )
      : null


  return {
    eventType,

    externalTransactionId,

    transactionIdentifier:
      getString(
        transaction.identifier
      ),

    status:
      isMed
        ? 'disputed'
        : 'chargeback',

    disputeId:
      chargeback
        ? getString(
            chargeback.id
          )
        : null,

    disputeType:
      chargeback
        ? getString(
            chargeback.type
          )
        : null,

    disputeStatus:
      chargeback
        ? getString(
            chargeback.status
          )
        : null,

    amount:
      chargeback
        ? getNumber(
            chargeback.amount
          )
        : null,

    currency:
      chargeback
        ? getString(
            chargeback.currency
          )
        : null,

    fineAmount:
      chargeback
        ? getNumber(
            chargeback.producerFineAmount
          )
        : null,

    origin:
      chargeback
        ? getString(
            chargeback.origin
          )
        : null,

    details:
      chargeback
        ? getString(
            chargeback.details
          )
        : null,

    createdAt,
    updatedAt,

    eventAt:
      updatedAt ??
      createdAt ??
      getString(
        transaction.payedAt
      ) ??
      getString(
        transaction.createdAt
      ),
  }
}
/*
 * =========================================================
 * CUSTOS FINANCEIROS
 * =========================================================
 *
 * REGRA IMPORTANTE:
 *
 * Somente transformamos em custo campos cuja semântica
 * seja explicitamente conhecida.
 *
 * NÃO usamos atualmente:
 *
 * transaction.commissionAmount
 * transaction.chargeAmount
 *
 * porque ainda não confirmamos que representem
 * taxas descontadas do produtor.
 * =========================================================
 */

export function normalizeApplyfyFinancialCosts(
  payload: WebhookPayload
): NormalizedFinancialCost[] {
  const eventType =
    getString(
      payload.event
    )


  if (
    !eventType
  ) {
    return []
  }


  /*
   * =======================================================
   * CHARGEBACK
   * =======================================================
   */

  const isChargeback =
    eventType ===
      'CHARGEBACK_CREATED' ||
    eventType ===
      'CHARGEBACK_UPDATED'


  if (
    !isChargeback
  ) {
    return []
  }


  const transaction =
    asRecord(
      payload.transaction
    )


  const chargeback =
    asRecord(
      payload.chargeback
    )


  if (
    !transaction ||
    !chargeback
  ) {
    return []
  }


  const transactionId =
    getString(
      transaction.id
    )


  const disputeId =
    getString(
      chargeback.id
    )


  const fineAmount =
    getNumber(
      chargeback.producerFineAmount
    )


  if (
    fineAmount === null ||
    fineAmount <= 0
  ) {
    return []
  }


  /*
   * Precisamos de uma referência estável.
   *
   * O índice único de finance_expenses
   * impedirá que CHARGEBACK_CREATED +
   * CHARGEBACK_UPDATED dupliquem a multa.
   */

  const referenceId =
    disputeId ??
    transactionId


  if (
    !referenceId
  ) {
    return []
  }


  const occurredAt =
    firstString(
      chargeback.updatedAt,
      chargeback.createdAt,
      transaction.payedAt,
      transaction.createdAt
    )


  return [
    {
      category:
        'chargeback_fee',

      name:
        'Taxa de chargeback Applyfy',

      description:
        'Multa informada pela Applyfy no evento de chargeback.',

      amount:
        fineAmount,

      currency:
        firstString(
          chargeback.currency,
          transaction.currency
        ),

      occurredAt,

      externalRef:
        `applyfy:chargeback-fine:${referenceId}`,

      metadata: {
        event_type:
          eventType,

        dispute_id:
          disputeId,

        transaction_id:
          transactionId,

        producer_fine_amount:
          fineAmount,
      },
    },
  ]
}