import {
  normalizeApplyfyFinancialCosts,
  normalizeApplyfyWebhook,
} from './applyfy'

import type {
  NormalizedFinancialCost,
  NormalizedWebhookMetadata,
  WebhookPayload,
  WebhookProvider,
} from './types'


export function normalizeWebhookMetadata(
  provider: WebhookProvider,
  payload: WebhookPayload
): NormalizedWebhookMetadata {
  switch (provider) {
    case 'applyfy':
      return normalizeApplyfyWebhook(
        payload
      )

    default:
      return {
        eventType:
          null,

        externalEventId:
          null,
      }
  }
}


/*
 * =========================================================
 * CUSTOS FINANCEIROS
 * =========================================================
 *
 * Cada provedor poderá possuir seu próprio normalizador,
 * mas todo o restante do Traffic Flow receberá o mesmo
 * formato NormalizedFinancialCost.
 * =========================================================
 */

export function normalizeFinancialCosts(
  provider: WebhookProvider,
  payload: WebhookPayload
): NormalizedFinancialCost[] {
  switch (provider) {
    case 'applyfy':
      return normalizeApplyfyFinancialCosts(
        payload
      )

    default:
      return []
  }
}