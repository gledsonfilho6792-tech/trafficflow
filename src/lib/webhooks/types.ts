export const WEBHOOK_PROVIDERS = [
  'applyfy',
  'hotmart',
  'mundpay',
  'wiven',
  'perfectpay',
  'cartpanda',
  'kiwify',
  'greenn',
  'payt',
] as const

export type WebhookProvider =
  (typeof WEBHOOK_PROVIDERS)[number]

export type WebhookPayload =
  Record<string, unknown>

export type NormalizedWebhookMetadata = {
  eventType: string | null
  externalEventId: string | null
}

export type NormalizedOrderStatus =
  | 'pending'
  | 'paid'
  | 'canceled'
  | 'refunded'
  | 'chargeback'
  | 'disputed'

export type NormalizedOrderItem = {
  externalItemId: string | null
  externalProductId: string | null
  externalProductReference: string | null
  productName: string | null

  quantity: number

  unitPrice: number | null
  totalAmount: number | null
}

export type NormalizedFinancialCostCategory =
  | 'checkout_fee'
  | 'tax'
  | 'operational'
  | 'chargeback_fee'
  | 'refund_fee'
  | 'other'


export type NormalizedFinancialCost = {
  category:
    NormalizedFinancialCostCategory

  name: string

  description:
    string | null

  amount: number

  currency: string | null

  occurredAt:
    string | null

  /*
   * Chave estável usada para impedir
   * duplicação do mesmo custo.
   */
  externalRef: string

  metadata:
    Record<
      string,
      unknown
    >
}

export type NormalizedOrder = {
  eventType: string

  externalOrderId: string
  externalTransactionId: string | null
  transactionIdentifier: string | null

  status: NormalizedOrderStatus

  currency: string

  grossAmount: number | null
  netAmount: number | null

  chargeAmount: number | null
  commissionAmount: number | null

  originalAmount: number | null
  originalCurrency: string | null
  exchangeRate: number | null

  paymentMethod: string | null
  installments: number | null

  offerCode: string | null

  paidAt: string | null
  providerCreatedAt: string | null

  customerExternalId: string | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null

  customerCountry: string | null
  customerState: string | null
  customerCity: string | null

  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null

  sessionId: string | null
  visitorId: string | null
  fbclid: string | null

  trackingData: Record<
    string,
    unknown
  >

  subscriptionExternalId: string | null
  subscriptionStatus: string | null

  items: NormalizedOrderItem[]
}

export type NormalizedDispute = {
  eventType: string

  externalTransactionId: string
  transactionIdentifier: string | null

  status:
    | 'chargeback'
    | 'disputed'

  disputeId: string | null
  disputeType: string | null
  disputeStatus: string | null

  amount: number | null
  currency: string | null

  fineAmount: number | null

  origin: string | null
  details: string | null

  createdAt: string | null
  updatedAt: string | null
  eventAt: string | null
}

export function isWebhookProvider(
  value: string
): value is WebhookProvider {
  return WEBHOOK_PROVIDERS.includes(
    value as WebhookProvider
  )
}