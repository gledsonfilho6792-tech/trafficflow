import { object, text as s } from "@/lib/workspace/types";
import type { NormalizedOrder, WebhookPayload, WebhookProvider } from "./types";
import { normalizeApplyfyOrder } from "./applyfy";
const num = (v: unknown) =>
  v === null || v === undefined || v === ""
    ? null
    : Number.isFinite(Number(v))
      ? Number(v)
      : null;
const string = (v: unknown) =>
  v === null || v === undefined ? null : String(v);
const iso = (v: unknown) => {
  if (!v) return null;
  const d = new Date(typeof v === "number" ? v : String(v));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
};
function base(event: string, id: string): NormalizedOrder {
  return {
    eventType: event,
    externalOrderId: id,
    externalTransactionId: id,
    transactionIdentifier: id,
    status: "pending",
    currency: "BRL",
    grossAmount: null,
    netAmount: null,
    chargeAmount: null,
    commissionAmount: null,
    originalAmount: null,
    originalCurrency: null,
    exchangeRate: null,
    paymentMethod: null,
    installments: null,
    offerCode: null,
    paidAt: null,
    providerCreatedAt: null,
    customerExternalId: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    customerCountry: null,
    customerState: null,
    customerCity: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    sessionId: null,
    visitorId: null,
    fbclid: null,
    trackingData: {},
    subscriptionExternalId: null,
    subscriptionStatus: null,
    items: [],
  };
}
export function normalizeHotmartOrder(
  payload: WebhookPayload,
): NormalizedOrder | null {
  const data = object(payload.data),
    purchase = object(data.purchase),
    product = object(data.product),
    buyer = object(data.buyer),
    price = object(purchase.price),
    event = s(payload, "event");
  const statuses: Record<string, NormalizedOrder["status"]> = {
    PURCHASE_APPROVED: "paid",
    PURCHASE_COMPLETE: "paid",
    PURCHASE_BILLET_PRINTED: "pending",
    PURCHASE_DELAYED: "pending",
    PURCHASE_CANCELED: "canceled",
    PURCHASE_REFUNDED: "refunded",
    PURCHASE_CHARGEBACK: "chargeback",
  };
  const status = statuses[event],
    id = s(purchase, "transaction");
  if (!status || !id) return null;
  const r = base(event, id);
  r.status = status;
  r.currency = s(price, "currency_value", "BRL");
  r.grossAmount = num(price.value);
  r.originalAmount = r.grossAmount;
  r.originalCurrency = r.currency;
  r.chargeAmount = r.grossAmount;
  r.providerCreatedAt = iso(purchase.order_date) || iso(payload.creation_date);
  r.paidAt =
    iso(purchase.approved_date) ||
    (status === "paid" ? iso(payload.creation_date) : null);
  r.customerName = string(buyer.name);
  r.customerEmail = string(buyer.email);
  r.customerExternalId = string(buyer.ucode);
  const address = object(buyer.address);
  r.customerCountry = string(address.country_iso) || string(address.country);
  r.customerState = string(address.state);
  r.customerCity = string(address.city);
  const payment = object(purchase.payment);
  r.paymentMethod = string(payment.type);
  r.installments = num(payment.installments_number);
  r.offerCode = string(object(purchase.offer).code);
  const tracking = object(purchase.tracking);
  for (const [key, field] of [
    ["utmSource", "utm_source"],
    ["utmMedium", "utm_medium"],
    ["utmCampaign", "utm_campaign"],
    ["utmContent", "utm_content"],
    ["utmTerm", "utm_term"],
  ] as const)
    r[key] = string(tracking[field]);
  r.trackingData = { provider_tracking: tracking };
  r.items = [
    {
      externalItemId: string(product.id),
      externalProductId: string(product.id),
      externalProductReference: string(product.ucode),
      productName: string(product.name),
      quantity: 1,
      unitPrice: r.grossAmount,
      totalAmount: r.grossAmount,
    },
  ];
  return r;
}
export function normalizeCaktoOrder(
  payload: WebhookPayload,
): NormalizedOrder | null {
  const data = object(payload.data),
    event = s(payload, "event"),
    id = s(data, "id");
  const statuses: Record<string, NormalizedOrder["status"]> = {
    purchase_approved: "paid",
    purchase_refused: "canceled",
    pix_gerado: "pending",
    boleto_gerado: "pending",
    refund: "refunded",
    chargeback: "chargeback",
    subscription_renewed: "paid",
  };
  if (!id || !statuses[event]) return null;
  const r = base(event, id);
  r.status = statuses[event];
  r.currency = s(data, "currency", "BRL");
  r.grossAmount = num(data.amount);
  r.chargeAmount = r.grossAmount;
  r.originalAmount = r.grossAmount;
  r.originalCurrency = r.currency;
  r.providerCreatedAt =
    iso(data.createdAt) || iso(data.created_at) || iso(payload.created_at);
  r.paidAt =
    iso(data.paidAt) ||
    iso(data.paid_at) ||
    (r.status === "paid" ? iso(data.updatedAt) || iso(data.updated_at) : null);
  r.paymentMethod = string(data.paymentMethod) || string(data.payment_method);
  const buyer = object(data.customer),
    address = object(data.address || buyer.address);
  r.customerName = string(buyer.name);
  r.customerEmail = string(buyer.email);
  r.customerPhone = string(buyer.phone);
  r.customerCountry = string(address.country);
  r.customerState = string(address.state);
  r.customerCity = string(address.city);
  const utms = object(data.utm) || {};
  r.utmSource = string(utms.utm_source || data.utm_source);
  r.utmMedium = string(utms.utm_medium || data.utm_medium);
  r.utmCampaign = string(utms.utm_campaign || data.utm_campaign);
  r.utmContent = string(utms.utm_content || data.utm_content);
  r.utmTerm = string(utms.utm_term || data.utm_term);
  const product = object(data.product);
  r.items = [
    {
      externalItemId: string(product.id),
      externalProductId: string(product.id),
      externalProductReference: null,
      productName: string(product.name),
      quantity: 1,
      unitPrice: r.grossAmount,
      totalAmount: r.grossAmount,
    },
  ];
  r.offerCode = string(object(data.offer).id);
  r.installments = num(data.installments);
  r.customerExternalId = string(buyer.id);
  r.trackingData = {
    fees: num(data.fees),
    ref_id: string(data.refId),
    offer_type: data.offer_type || null,
    parent_order: data.parent_order || null,
  };
  return r;
}
export function normalizeProviderOrder(
  provider: WebhookProvider,
  payload: WebhookPayload,
) {
  return provider === "applyfy"
    ? normalizeApplyfyOrder(payload)
    : provider === "hotmart"
      ? normalizeHotmartOrder(payload)
      : provider === "cakto"
        ? normalizeCaktoOrder(payload)
        : null;
}
