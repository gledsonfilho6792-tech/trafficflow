import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateWebhook } from "@/lib/webhooks/authenticate";
import { normalizeProviderOrder } from "@/lib/webhooks/provider-orders";
import { normalizeWebhookMetadata } from "@/lib/webhooks/normalize";
import { processWebhookEvent } from "@/lib/webhooks/process";
import { redactWebhookSecrets } from "@/lib/webhooks/redact";
import { isWebhookProvider, type WebhookPayload } from "@/lib/webhooks/types";
import { createSaleNotice, queueConversions } from "@/lib/workspace/automation";
import { object, strings } from "@/lib/workspace/types";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; integrationId: string }> },
) {
  try {
    const { provider: rawProvider, integrationId } = await params,
      provider = rawProvider.toLowerCase();
    if (
      !isWebhookProvider(provider) ||
      !/^\w{8}(-\w{4}){3}-\w{12}$/.test(integrationId)
    )
      return NextResponse.json(
        { ok: false, error: "Integração não encontrada." },
        { status: 404 },
      );
    if (Number(request.headers.get("content-length") || 0) > 1_000_000)
      return NextResponse.json(
        { ok: false, error: "Payload muito grande." },
        { status: 413 },
      );
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_000_000)
      return NextResponse.json(
        { ok: false, error: "Payload muito grande." },
        { status: 413 },
      );
    let payload: WebhookPayload;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw Error();
      payload = parsed;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Payload JSON inválido." },
        { status: 400 },
      );
    }
    const admin = createAdminClient();
    const { data: integration, error } = await admin
      .from("integrations")
      .select("id,project_id,provider,integration_type,status,config")
      .eq("id", integrationId)
      .eq("provider", provider)
      .maybeSingle();
    if (error || !integration)
      return NextResponse.json(
        { ok: false, error: "Integração não encontrada." },
        { status: 404 },
      );
    if (
      integration.integration_type !== "checkout" ||
      integration.status === "disabled" ||
      !["applyfy", "hotmart", "cakto"].includes(provider)
    )
      return NextResponse.json(
        { ok: false, error: "Integração indisponível." },
        { status: 403 },
      );
    const config = object(integration.config);
    let signingSecret: string | null = null;
    if (provider === "cakto" && request.headers.has("x-cakto-signature")) {
      const { data: stored } = await admin.rpc("get_integration_secret", {
        p_integration_id: integrationId,
      });
      try {
        signingSecret = String(
          object(JSON.parse(String(stored))).webhook_secret || "",
        );
      } catch {}
    }
    if (
      !authenticateWebhook(
        provider,
        payload,
        request.headers,
        raw,
        String(config.webhook_token_sha256 || ""),
        signingSecret,
      )
    )
      return NextResponse.json(
        { ok: false, error: "Webhook não autorizado." },
        { status: 401 },
      );
    if (!strings(config.product_ids).length)
      return NextResponse.json(
        {
          ok: false,
          error:
            "Configure os produtos desta oferta na integração antes de receber vendas.",
        },
        { status: 409 },
      );
    const envelopes =
      provider === "cakto" && Array.isArray(payload.data)
        ? payload.data.map((data) => ({ ...payload, data: object(data) }))
        : [payload];
    if (envelopes.length > 100)
      return NextResponse.json(
        { ok: false, error: "Lote excede 100 pedidos." },
        { status: 413 },
      );
    const results = [];
    for (const envelope of envelopes) {
      const normalizedOrder = normalizeProviderOrder(provider, envelope),
        allowed = strings(config.product_ids);
      if (
        (normalizedOrder &&
          allowed.length &&
          !normalizedOrder.items.some(
            (item) =>
              !!item.externalProductId &&
              allowed.includes(item.externalProductId),
          )) ||
        (normalizedOrder &&
          config.offer_code &&
          normalizedOrder.offerCode !== config.offer_code)
      ) {
        results.push({
          ignored: true,
          reason: "Produto ou oferta não vinculados a esta dashboard.",
        });
        continue;
      }
      const metadata = normalizeWebhookMetadata(provider, envelope);
      const logicalKey =
        metadata.eventType && metadata.externalEventId
          ? [
              provider,
              integrationId,
              metadata.eventType,
              metadata.externalEventId,
            ].join(":")
          : JSON.stringify(envelope);
      const dedupe = createHash("sha256")
        .update(provider + ":" + integrationId + ":" + logicalKey)
        .digest("hex");
      const { data: inserted, error: insertError } = await admin
        .from("webhook_events")
        .insert({
          project_id: integration.project_id,
          integration_id: integrationId,
          provider,
          event_type: metadata.eventType,
          external_event_id: metadata.externalEventId,
          dedupe_key: dedupe,
          payload: redactWebhookSecrets(envelope),
          status: "received",
          received_at: new Date().toISOString(),
        })
        .select("id,received_at")
        .single();
      let event = inserted;
      if (insertError?.code === "23505") {
        // Only the winner of this compare-and-swap retries a previously failed event.
        const { data: retry, error: retryError } = await admin
          .from("webhook_events")
          .update({ status: "received", error_message: null })
          .eq("dedupe_key", dedupe)
          .eq("integration_id", integrationId)
          .eq("status", "error")
          .select("id,received_at")
          .maybeSingle();
        if (retryError) throw Error("Falha ao recuperar evento.");
        if (!retry) {
          results.push({ duplicate: true });
          continue;
        }
        event = retry;
      } else if (insertError) throw Error("Erro ao armazenar webhook.");
      if (!event) throw Error("Evento não encontrado.");
      const processing = await processWebhookEvent({
        webhookEventId: event.id,
        projectId: integration.project_id,
        integrationId,
        provider,
        payload: envelope,
      });
      if (processing.processed && processing.orderId) {
        try {
          await createSaleNotice(integration.project_id, processing.orderId);
          await queueConversions(integration.project_id, processing.orderId);
        } catch (e) {
          console.error(
            "Post-webhook workflow failed",
            e instanceof Error ? e.message : "unknown",
          );
        }
      }
      results.push({
        ...processing,
        eventId: event.id,
        receivedAt: event.received_at,
      });
    }
    if (results.some((r) => "processed" in r && r.processed))
      await admin
        .from("integrations")
        .update({
          status: "connected",
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", integrationId);
    return NextResponse.json({
      ok: true,
      provider,
      received: true,
      ...(results.length === 1
        ? results[0]
        : {
            results,
            processed: results.some((r) => "processed" in r && r.processed),
          }),
    });
  } catch (e) {
    console.error(
      "Webhook processing failed",
      e instanceof Error ? e.message : "unknown",
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Falha ao processar evento. Consulte o histórico de eventos.",
      },
      { status: 500 },
    );
  }
}
