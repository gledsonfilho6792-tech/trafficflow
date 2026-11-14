import {
  normalizeApplyfyFinancialCosts,
  normalizeApplyfyWebhook,
} from "./applyfy";

import { object, text } from "@/lib/workspace/types";

import type {
  NormalizedFinancialCost,
  NormalizedWebhookMetadata,
  WebhookPayload,
  WebhookProvider,
} from "./types";

export function normalizeWebhookMetadata(
  provider: WebhookProvider,
  payload: WebhookPayload,
): NormalizedWebhookMetadata {
  switch (provider) {
    case "applyfy":
      return normalizeApplyfyWebhook(payload);

    case "hotmart":
      return {
        eventType: text(payload, "event") || null,
        externalEventId: text(payload, "id") || null,
      };
    case "cakto":
      return {
        eventType: text(payload, "event") || null,
        externalEventId:
          text(payload, "id") ||
          text(object(payload.data), "id") + ":" + text(payload, "event"),
      };
    default:
      return {
        eventType: null,

        externalEventId: null,
      };
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
  payload: WebhookPayload,
): NormalizedFinancialCost[] {
  switch (provider) {
    case "applyfy":
      return normalizeApplyfyFinancialCosts(payload);

    case "cakto": {
      const data = object(payload.data),
        fee = Number(data.fees),
        id = text(data, "id");
      if (
        !id ||
        !Number.isFinite(fee) ||
        fee <= 0 ||
        ![
          "purchase_approved",
          "subscription_renewed",
          "refund",
          "chargeback",
        ].includes(text(payload, "event"))
      )
        return [];
      return [
        {
          category: "checkout_fee",
          name: "Taxa do checkout Cakto",
          description: "Taxa informada pelo checkout no pedido " + id,
          amount: fee,
          currency: text(data, "currency", "BRL"),
          occurredAt: text(data, "paidAt") || text(data, "createdAt") || null,
          externalRef: "cakto:checkout_fee:" + id,
          metadata: { order_external_id: id, source_field: "data.fees" },
        },
      ];
    }
    default:
      return [];
  }
}
