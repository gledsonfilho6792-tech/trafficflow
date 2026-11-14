import {canApplyOrderStatus} from './order-transition'
import { normalizeProviderOrder } from './provider-orders'
import {
  createAdminClient,
} from '@/lib/supabase/admin'

import {
  resolveOrderAttribution,
} from '@/lib/attribution/resolve-order-attribution'

import {
  processFinancialCosts,
} from './process-financial-costs'

import {
  normalizeApplyfyDispute,
} from './applyfy'

import type {
  WebhookPayload,
  WebhookProvider,
} from './types'


type ProcessWebhookParams = {
  webhookEventId: string

  projectId: string
  integrationId: string

  provider: WebhookProvider
  payload: WebhookPayload
}


function getTransportedAttributionToken(
  utmTerm:
    | string
    | null
    | undefined
) {
  if (
    typeof utmTerm ===
      'string' &&
    utmTerm.startsWith(
      'tf_'
    )
  ) {
    return utmTerm
  }

  return null
}


export async function processWebhookEvent({
  webhookEventId,
  projectId,
  integrationId,
  provider,
  payload,
}: ProcessWebhookParams) {
  const admin =
    createAdminClient()

  try {
    /*
     * =====================================================
     * PROVIDERS
     * =====================================================
     *
     * Neste momento a Applyfy é nosso
     * primeiro adapter operacional.
     *
     * O motor de orders + attribution
     * abaixo continuará sendo usado
     * pelos próximos adapters.
     * =====================================================
     */

    if (
      !['applyfy','hotmart','cakto'].includes(provider)
    ) {
      await admin
        .from(
          'webhook_events'
        )
        .update({
          status:
            'ignored',

          processed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          webhookEventId
        )

      return {
        processed:
          false,

        orderId:
          null,
      }
    }


    /*
     * =====================================================
     * TRANSAÇÕES NORMAIS
     *
     * CREATED
     * PAID
     * CANCELED
     * REFUNDED
     * =====================================================
     */

    const normalizedOrder =
      normalizeProviderOrder(provider, payload)


    if (normalizedOrder) {

      /*
       * ===================================================
       * ATRIBUIÇÃO
       * ===================================================
       *
       * Prioridades definidas dentro
       * do resolvedor:
       *
       * 1. session_id direto
       * 2. attribution token tf_...
       *
       * Para Applyfy atualmente:
       *
       * utm_term=tf_xxxxx
       *        ↓
       * attribution_tokens
       *        ↓
       * tracking_sessions
       */

      const resolvedAttribution =
        await resolveOrderAttribution({
          admin,
          projectId,
          order:
            normalizedOrder,
        })


      /*
       * Mesmo se por algum motivo
       * a sessão ainda não for
       * encontrada, preservamos
       * o token transportado para
       * diagnóstico/reprocessamento.
       */
      const {data:existingOrder,error:existingError}=await admin.from('orders').select('id,status').eq('integration_id',integrationId).eq('external_order_id',normalizedOrder.externalOrderId).maybeSingle()
      if(existingError)throw new Error(existingError.message)
      if(existingOrder&&!canApplyOrderStatus(existingOrder.status,normalizedOrder.status)){
        await admin.from('webhook_events').update({status:'ignored',processed_at:new Date().toISOString()}).eq('id',webhookEventId)
        return {processed:false,orderId:existingOrder.id}
      }

      const transportedToken =
        getTransportedAttributionToken(
          normalizedOrder
            .utmTerm
        )


      /*
       * ===================================================
       * PEDIDO
       * ===================================================
       */

      const orderData:
        Record<
          string,
          unknown
        > = {
        project_id:
          projectId,

        integration_id:
          integrationId,

        provider,

        external_order_id:
          normalizedOrder
            .externalOrderId,

        status:
          normalizedOrder.status,

        currency:
          normalizedOrder.currency,

        raw_data: {
          last_event_type:
            normalizedOrder
              .eventType,

          attribution_token_received:
            transportedToken,
        },
      }


      /*
       * ===================================================
       * IDENTIFICAÇÃO DA TRANSAÇÃO
       * ===================================================
       */

      if (
        normalizedOrder
          .externalTransactionId
      ) {
        orderData
          .external_transaction_id =
          normalizedOrder
            .externalTransactionId
      }


      if (
        normalizedOrder
          .transactionIdentifier
      ) {
        orderData
          .transaction_identifier =
          normalizedOrder
            .transactionIdentifier
      }


      /*
       * ===================================================
       * VALORES FINANCEIROS
       * ===================================================
       */

      if (
        normalizedOrder
          .grossAmount !==
        null
      ) {
        orderData
          .gross_amount =
          normalizedOrder
            .grossAmount
      }


      if (
        normalizedOrder
          .netAmount !==
        null
      ) {
        orderData
          .net_amount =
          normalizedOrder
            .netAmount
      }


      if (
        normalizedOrder
          .chargeAmount !==
        null
      ) {
        orderData
          .charge_amount =
          normalizedOrder
            .chargeAmount
      }


      if (
        normalizedOrder
          .commissionAmount !==
        null
      ) {
        orderData
          .commission_amount =
          normalizedOrder
            .commissionAmount
      }


      if (
        normalizedOrder
          .originalAmount !==
        null
      ) {
        orderData
          .original_amount =
          normalizedOrder
            .originalAmount
      }


      if (
        normalizedOrder
          .originalCurrency
      ) {
        orderData
          .original_currency =
          normalizedOrder
            .originalCurrency
      }


      if (
        normalizedOrder
          .exchangeRate !==
        null
      ) {
        orderData
          .exchange_rate =
          normalizedOrder
            .exchangeRate
      }


      /*
       * ===================================================
       * PAGAMENTO
       * ===================================================
       */

      if (
        normalizedOrder
          .paymentMethod
      ) {
        orderData
          .payment_method =
          normalizedOrder
            .paymentMethod
      }


      if (
        normalizedOrder
          .installments !==
        null
      ) {
        orderData
          .installments =
          normalizedOrder
            .installments
      }


      if (
        normalizedOrder
          .offerCode
      ) {
        orderData
          .offer_code =
          normalizedOrder
            .offerCode
      }


      /*
       * Não sobrescrevemos paid_at
       * com NULL quando chegar
       * cancelamento/reembolso.
       */

      if (
        normalizedOrder
          .paidAt
      ) {
        orderData
          .paid_at =
          normalizedOrder
            .paidAt
      }


      if (
        normalizedOrder
          .providerCreatedAt
      ) {
        orderData
          .provider_created_at =
          normalizedOrder
            .providerCreatedAt
      }


      /*
       * ===================================================
       * CLIENTE
       * ===================================================
       */

      if (
        normalizedOrder
          .customerExternalId
      ) {
        orderData
          .customer_external_id =
          normalizedOrder
            .customerExternalId
      }


      if (
        normalizedOrder
          .customerName
      ) {
        orderData
          .customer_name =
          normalizedOrder
            .customerName
      }


      if (
        normalizedOrder
          .customerEmail
      ) {
        orderData
          .customer_email =
          normalizedOrder
            .customerEmail
      }


      if (
        normalizedOrder
          .customerPhone
      ) {
        orderData
          .customer_phone =
          normalizedOrder
            .customerPhone
      }


      if (
        normalizedOrder
          .customerCountry
      ) {
        orderData
          .customer_country =
          normalizedOrder
            .customerCountry
      }


      if (
        normalizedOrder
          .customerState
      ) {
        orderData
          .customer_state =
          normalizedOrder
            .customerState
      }


      if (
        normalizedOrder
          .customerCity
      ) {
        orderData
          .customer_city =
          normalizedOrder
            .customerCity
      }


      /*
       * ===================================================
       * ATRIBUIÇÃO RESOLVIDA
       * ===================================================
       *
       * Se conseguimos encontrar a
       * tracking_session, ela passa a
       * ser nossa fonte da verdade.
       *
       * Isso é especialmente importante
       * na Applyfy porque utm_term foi
       * usado apenas como transporte
       * do token tf_...
       * ===================================================
       */

      if (
        resolvedAttribution
      ) {
        orderData
          .tracking_session_id =
          resolvedAttribution
            .trackingSessionId

        orderData
          .tracking_source_id =
          resolvedAttribution
            .trackingSourceId

        orderData
          .attribution_method =
          resolvedAttribution
            .attributionMethod

        orderData
          .attributed_at =
          resolvedAttribution
            .attributedAt


        if (
          resolvedAttribution
            .attributionToken
        ) {
          orderData
            .attribution_token =
            resolvedAttribution
              .attributionToken
        }


        /*
         * IDs originais do Traffic Flow.
         */

        orderData
          .session_id =
          resolvedAttribution
            .sessionId

        orderData
          .visitor_id =
          resolvedAttribution
            .visitorId


        /*
         * UTMs ORIGINAIS recuperadas
         * da tracking_session.
         */

        if (
          resolvedAttribution
            .utmSource
        ) {
          orderData
            .utm_source =
            resolvedAttribution
              .utmSource
        }


        if (
          resolvedAttribution
            .utmMedium
        ) {
          orderData
            .utm_medium =
            resolvedAttribution
              .utmMedium
        }


        if (
          resolvedAttribution
            .utmCampaign
        ) {
          orderData
            .utm_campaign =
            resolvedAttribution
              .utmCampaign
        }


        if (
          resolvedAttribution
            .utmContent
        ) {
          orderData
            .utm_content =
            resolvedAttribution
              .utmContent
        }


        if (
          resolvedAttribution
            .utmTerm
        ) {
          orderData
            .utm_term =
            resolvedAttribution
              .utmTerm
        }


        if (
          resolvedAttribution
            .fbclid
        ) {
          orderData
            .fbclid =
            resolvedAttribution
              .fbclid
        }
      }


      /*
       * ===================================================
       * FALLBACK DE TRACKING
       * ===================================================
       *
       * Se ainda não conseguimos
       * resolver a sessão, guardamos
       * aquilo que o checkout trouxe.
       *
       * Porém NÃO salvamos tf_xxx como
       * se fosse uma UTM Term real.
       * ===================================================
       */

      else {
        if (
          normalizedOrder
            .utmSource
        ) {
          orderData
            .utm_source =
            normalizedOrder
              .utmSource
        }


        if (
          normalizedOrder
            .utmMedium
        ) {
          orderData
            .utm_medium =
            normalizedOrder
              .utmMedium
        }


        if (
          normalizedOrder
            .utmCampaign
        ) {
          orderData
            .utm_campaign =
            normalizedOrder
              .utmCampaign
        }


        if (
          normalizedOrder
            .utmContent
        ) {
          orderData
            .utm_content =
            normalizedOrder
              .utmContent
        }


        /*
         * Apenas uma UTM Term normal
         * entra aqui.
         *
         * tf_... é attribution token.
         */

        if (
          normalizedOrder
            .utmTerm &&
          !transportedToken
        ) {
          orderData
            .utm_term =
            normalizedOrder
              .utmTerm
        }


        if (
          normalizedOrder
            .sessionId
        ) {
          orderData
            .session_id =
            normalizedOrder
              .sessionId
        }


        if (
          normalizedOrder
            .visitorId
        ) {
          orderData
            .visitor_id =
            normalizedOrder
              .visitorId
        }


        if (
          normalizedOrder
            .fbclid
        ) {
          orderData
            .fbclid =
            normalizedOrder
              .fbclid
        }


        /*
         * Mesmo não resolvido,
         * preservamos o token.
         */

        if (
          transportedToken
        ) {
          orderData
            .attribution_token =
            transportedToken
        }
      }


      /*
       * Dados complementares:
       *
       * FBP/FBC
       * GCLID
       * TTCLID
       * source_key
       * checkout URL
       * etc.
       */

      orderData
        .tracking_data =
        normalizedOrder
          .trackingData


      /*
       * ===================================================
       * ASSINATURA
       * ===================================================
       */

      if (
        normalizedOrder
          .subscriptionExternalId
      ) {
        orderData
          .subscription_external_id =
          normalizedOrder
            .subscriptionExternalId
      }


      if (
        normalizedOrder
          .subscriptionStatus
      ) {
        orderData
          .subscription_status =
          normalizedOrder
            .subscriptionStatus
      }


      /*
       * ===================================================
       * UPSERT DO PEDIDO
       * ===================================================
       */

      const {
        data: order,
        error:
          orderError,
      } =
        await admin
          .from('orders')
          .upsert(
            orderData,
            {
              onConflict:
                'integration_id,external_order_id',
            }
          )
          .select(
            'id'
          )
          .single()


      if (
        orderError ||
        !order
      ) {
        throw new Error(
          orderError
            ?.message ??
          'Erro ao salvar pedido.'
        )
      }


      /*
       * ===================================================
       * ITENS
       * ===================================================
       */

      if (
        normalizedOrder
          .items.length >
        0
      ) {
        const {
          error:
            deleteError,
        } =
          await admin
            .from(
              'order_items'
            )
            .delete()
            .eq(
              'order_id',
              order.id
            )


        if (
          deleteError
        ) {
          throw new Error(
            deleteError.message
          )
        }


        const {
          error:
            itemsError,
        } =
          await admin
            .from(
              'order_items'
            )
            .insert(
              normalizedOrder
                .items
                .map(
                  (
                    item
                  ) => ({
                    order_id:
                      order.id,

                    external_item_id:
                      item
                        .externalItemId,

                    external_product_id:
                      item
                        .externalProductId,

                    external_product_reference:
                      item
                        .externalProductReference,

                    product_name:
                      item
                        .productName,

                    quantity:
                      item
                        .quantity,

                    unit_price:
                      item
                        .unitPrice,

                    total_amount:
                      item
                        .totalAmount,
                  })
                )
            )


        if (
          itemsError
        ) {
          throw new Error(
            itemsError.message
          )
        }
      }


      /*
       * ===================================================
       * HISTÓRICO
       * ===================================================
       */

      const {
        error:
          eventError,
      } =
        await admin
          .from(
            'order_events'
          )
          .upsert(
            {
              order_id:
                order.id,

              webhook_event_id:
                webhookEventId,

              project_id:
                projectId,

              integration_id:
                integrationId,

              provider,

              event_type:
                normalizedOrder
                  .eventType,

              external_event_id:
                normalizedOrder
                  .externalTransactionId ??
                normalizedOrder
                  .externalOrderId,

              normalized_status:
                normalizedOrder
                  .status,

              event_at:
                normalizedOrder
                  .paidAt ??
                normalizedOrder
                  .providerCreatedAt,

              data: {
                gross_amount:
                  normalizedOrder
                    .grossAmount,

                charge_amount:
                  normalizedOrder
                    .chargeAmount,

                commission_amount:
                  normalizedOrder
                    .commissionAmount,

                original_amount:
                  normalizedOrder
                    .originalAmount,

                original_currency:
                  normalizedOrder
                    .originalCurrency,

                exchange_rate:
                  normalizedOrder
                    .exchangeRate,

                currency:
                  normalizedOrder
                    .currency,

                payment_method:
                  normalizedOrder
                    .paymentMethod,


                /*
                 * Diagnóstico de atribuição.
                 */

                attribution_method:
                  resolvedAttribution
                    ?.attributionMethod ??
                  null,

                attribution_token:
                  resolvedAttribution
                    ?.attributionToken ??
                  transportedToken,

                tracking_session_id:
                  resolvedAttribution
                    ?.trackingSessionId ??
                  null,

                tracking_source_id:
                  resolvedAttribution
                    ?.trackingSourceId ??
                  null,
              },
            },
            {
              onConflict:
                'webhook_event_id',

              ignoreDuplicates:
                true,
            }
          )


      if (
        eventError
      ) {
        throw new Error(
          eventError.message
        )
      }

/*
 * ===================================================
 * CUSTOS FINANCEIROS AUTOMÁTICOS
 * ===================================================
 *
 * Hoje normalmente será [] para os eventos
 * normais da Applyfy.
 *
 * Mantemos aqui porque futuramente um provider
 * pode informar uma taxa confiável em PAID,
 * REFUNDED etc.
 * ===================================================
 */

await processFinancialCosts({
  projectId,

  provider,

  payload,
})

      /*
       * ===================================================
       * WEBHOOK PROCESSADO
       * ===================================================
       */

      await admin
        .from(
          'webhook_events'
        )
        .update({
          status:
            'processed',

          processed_at:
            new Date()
              .toISOString(),

          error_message:
            null,
        })
        .eq(
          'id',
          webhookEventId
        )


      return {
        processed:
          true,

        orderId:
          order.id,

        attributed:
          Boolean(
            resolvedAttribution
          ),

        attributionMethod:
          resolvedAttribution
            ?.attributionMethod ??
          null,
      }
    }


    /*
     * =====================================================
     * CHARGEBACK / MED
     * =====================================================
     */

    const dispute =
      normalizeApplyfyDispute(
        payload
      )


    if (dispute) {

      /*
       * Primeiro tentamos localizar
       * pela transaction.id.
       */

      let {
        data: order,
        error:
          findError,
      } =
        await admin
          .from(
            'orders'
          )
          .select(
            `
            id,
            raw_data
            `
          )
          .eq(
            'integration_id',
            integrationId
          )
          .eq(
            'external_transaction_id',
            dispute
              .externalTransactionId
          )
          .maybeSingle()


      /*
       * Fallback:
       * transaction.identifier
       */

      if (
        !order &&
        dispute
          .transactionIdentifier
      ) {
        const result =
          await admin
            .from(
              'orders'
            )
            .select(
              `
              id,
              raw_data
              `
            )
            .eq(
              'integration_id',
              integrationId
            )
            .eq(
              'transaction_identifier',
              dispute
                .transactionIdentifier
            )
            .maybeSingle()


        order =
          result.data

        findError =
          result.error
      }


      if (
        findError
      ) {
        throw new Error(
          findError.message
        )
      }


      /*
       * Se o chargeback/MED chegou
       * antes do pedido original,
       * mantemos erro para permitir
       * retry do provedor.
       */

      if (!order) {
        throw new Error(
          'Pedido correspondente ao chargeback/MED não encontrado.'
        )
      }


      const previousRawData =
        order.raw_data &&
        typeof order.raw_data ===
          'object' &&
        !Array.isArray(
          order.raw_data
        )
          ? (
              order.raw_data as Record<
                string,
                unknown
              >
            )
          : {}


      const {
        error:
          updateError,
      } =
        await admin
          .from(
            'orders'
          )
          .update({
            status:
              dispute.status,

            dispute_id:
              dispute
                .disputeId,

            dispute_type:
              dispute
                .disputeType,

            dispute_status:
              dispute
                .disputeStatus,

            dispute_amount:
              dispute.amount,

            dispute_fine_amount:
              dispute
                .fineAmount,

            dispute_origin:
              dispute.origin,

            dispute_details:
              dispute.details,

            dispute_updated_at:
              dispute
                .updatedAt ??
              dispute
                .createdAt,

            raw_data: {
              ...previousRawData,

              last_event_type:
                dispute
                  .eventType,
            },
          })
          .eq(
            'id',
            order.id
          )


      if (
        updateError
      ) {
        throw new Error(
          updateError.message
        )
      }


      /*
       * ===================================================
       * HISTÓRICO CHARGEBACK / MED
       * ===================================================
       */

      const {
        error:
          eventError,
      } =
        await admin
          .from(
            'order_events'
          )
          .upsert(
            {
              order_id:
                order.id,

              webhook_event_id:
                webhookEventId,

              project_id:
                projectId,

              integration_id:
                integrationId,

              provider,

              event_type:
                dispute
                  .eventType,

              external_event_id:
                dispute
                  .disputeId ??
                dispute
                  .externalTransactionId,

              normalized_status:
                dispute.status,

              event_at:
                dispute.eventAt,

              data: {
                dispute_id:
                  dispute
                    .disputeId,

                dispute_type:
                  dispute
                    .disputeType,

                dispute_status:
                  dispute
                    .disputeStatus,

                amount:
                  dispute.amount,

                currency:
                  dispute.currency,

                fine_amount:
                  dispute
                    .fineAmount,

                origin:
                  dispute.origin,

                details:
                  dispute.details,
              },
            },
          
            {
              onConflict:
                'webhook_event_id',

              ignoreDuplicates:
                true,
            }
          )

      if (
  eventError
) {
  throw new Error(
    eventError.message
  )
}

/*
 * ===================================================
 * CUSTOS FINANCEIROS AUTOMÁTICOS
 * ===================================================
 *
 * Applyfy:
 *
 * producerFineAmount
 *        ↓
 * chargeback_fee
 *        ↓
 * finance_expenses
 *
 * CHARGEBACK_UPDATED reutiliza o mesmo external_ref,
 * portanto atualiza o custo existente sem duplicar.
 * ===================================================
 */

await processFinancialCosts({
  projectId,

  provider,

  payload,
})

      await admin
        .from(
          'webhook_events'
        )
        .update({
          status:
            'processed',

          processed_at:
            new Date()
              .toISOString(),

          error_message:
            null,
        })
        .eq(
          'id',
          webhookEventId
        )


      return {
        processed:
          true,

        orderId:
          order.id,
      }
    }


    /*
     * =====================================================
     * EVENTO AINDA NÃO UTILIZADO
     * =====================================================
     */

    await admin
      .from(
        'webhook_events'
      )
      .update({
        status:
          'ignored',

        processed_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'id',
        webhookEventId
      )


    return {
      processed:
        false,

      orderId:
        null,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Erro desconhecido'


    await admin
      .from(
        'webhook_events'
      )
      .update({
        status:
          'error',

        error_message:
          message,
      })
      .eq(
        'id',
        webhookEventId
      )


    throw error
  }
}