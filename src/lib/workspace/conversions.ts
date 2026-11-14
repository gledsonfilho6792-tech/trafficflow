import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { object } from "./types";
const sha = (v: string) =>
  createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
export async function deliverConversions() {
  const admin = createAdminClient();
  const { data: jobs, error } = await admin
    .from("conversion_deliveries")
    .select("*")
    .in("status", ["pending", "error", "processing"])
    .lte("next_attempt_at", new Date().toISOString())
    .lt("attempts", 5)
    .order("created_at")
    .limit(20);
  if (error) throw new Error(error.message);
  let sent = 0,
    failed = 0,
    claimed = 0;
  for (const job of jobs || []) {
    const { data: claim, error: ce } = await admin
      .from("conversion_deliveries")
      .update({
        status: "processing",
        attempts: job.attempts + 1,
        next_attempt_at: new Date(Date.now() + 300000).toISOString(),
      })
      .eq("id", job.id)
      .eq("attempts", job.attempts)
      .eq("next_attempt_at", job.next_attempt_at)
      .in("status", ["pending", "error", "processing"])
      .select("id")
      .maybeSingle();
    if (ce) throw new Error(ce.message);
    if (!claim) continue;
    claimed++;
    job.attempts++;
    try {
      const { data: integration, error: ie } = await admin
        .from("integrations")
        .select("id,status,config,project_id")
        .eq("id", job.integration_id)
        .eq("project_id", job.project_id)
        .single();
      if (ie || !integration) throw new Error("Integração não encontrada.");
      if (integration.status === "disabled") {
        await admin
          .from("conversion_deliveries")
          .update({ status: "disabled" })
          .eq("id", job.id);
        continue;
      }
      if (job.provider !== "meta")
        throw new Error("Plataforma de conversão não suportada.");
      const { data: order, error: oe } = await admin
        .from("orders")
        .select(
          "id,status,paid_at,currency,gross_amount,customer_email,customer_phone,tracking_session_id",
        )
        .eq("id", job.order_id)
        .eq("project_id", job.project_id)
        .single();
      if (oe || !order || order.status !== "paid")
        throw new Error("Pedido não está aprovado.");
      const eventTime = Math.floor(Date.parse(order.paid_at) / 1000);
      if (!eventTime || Date.now() / 1000 - eventTime > 7 * 86400)
        throw new Error("Conversão fora da janela de envio.");
      const { data: stored, error: se } = await admin.rpc(
        "get_integration_secret",
        { p_integration_id: integration.id },
      );
      if (se || !stored) throw new Error("Credencial CAPI indisponível.");
      const credentials = object(JSON.parse(String(stored))),
        token = String(credentials.access_token || "");
      if (!token) throw new Error("Token CAPI não configurado.");
      const pixelId = String(object(integration.config).pixel_id || "");
      if (!/^\d+$/.test(pixelId)) throw new Error("Pixel inválido.");
      const { data: settings } = await admin
        .from("project_settings")
        .select("sales_page_url")
        .eq("project_id", job.project_id)
        .maybeSingle();
      let session = null;
      if (order.tracking_session_id) {
        const { data } = await admin
          .from("tracking_sessions")
          .select("fbp,fbc,user_agent")
          .eq("id", order.tracking_session_id)
          .eq("project_id", job.project_id)
          .maybeSingle();
        session = data;
      }
      const userData: Record<string, unknown> = {};
      if (order.customer_email) userData.em = [sha(order.customer_email)];
      if (order.customer_phone) {
        const digits = order.customer_phone.replace(/\D/g, "");
        if (digits) userData.ph = [sha(digits)];
      }
      if (session?.fbp) userData.fbp = session.fbp;
      if (session?.fbc) userData.fbc = session.fbc;
      if (session?.user_agent) userData.client_user_agent = session.user_agent;
      if (!userData.em && !userData.ph && !userData.fbc)
        throw new Error("Pedido sem identificadores suficientes para o envio.");
      const payload = {
        data: [
          {
            event_name: "Purchase",
            event_id: job.event_id,
            event_time: eventTime,
            action_source: "website",
            ...(settings?.sales_page_url
              ? { event_source_url: settings.sales_page_url }
              : {}),
            user_data: userData,
            custom_data: {
              value: Number(order.gross_amount),
              currency: order.currency,
              order_id: order.id,
            },
          },
        ],
      };
      const response = await fetch(
        `https://graph.facebook.com/${process.env.META_API_VERSION || "v26.0"}/${pixelId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20000),
        },
      );
      const result = await response.json();
      if (!response.ok || result.error || result.events_received !== 1)
        throw new Error(
          result.error?.message || "Conversão não confirmada pela Meta.",
        );
      const { error: updated } = await admin
        .from("conversion_deliveries")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", job.id);
      if (updated) throw new Error(updated.message);
      await admin
        .from("integrations")
        .update({
          status: "connected",
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
      sent++;
    } catch (e) {
      failed++;
      await admin
        .from("conversion_deliveries")
        .update({
          status: "error",
          last_error: (e instanceof Error
            ? e.message
            : "Falha no envio."
          ).slice(0, 500),
          next_attempt_at: new Date(
            Date.now() + Math.min(3600, 60 * 2 ** job.attempts) * 1000,
          ).toISOString(),
        })
        .eq("id", job.id);
    }
  }
  return { claimed, sent, failed };
}
