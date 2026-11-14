import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSystemWorkspace } from "./server";
import { aggregate, dateInZone } from "./analytics";
import { object, text as s, strings } from "./types";
export async function createNotice(
  projectId: string,
  kind: string,
  title: string,
  body: string,
  dedupe: string,
) {
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();
  if (!project) return;
  const { error } = await admin.from("app_notifications").upsert(
    {
      project_id: projectId,
      user_id: project.owner_id,
      kind,
      title,
      body,
      dedupe_key: dedupe,
    },
    { onConflict: "project_id,user_id,dedupe_key", ignoreDuplicates: true },
  );
  if (error) throw new Error("Falha ao gerar notificação: " + error.message);
}
export async function evaluateProjectRules(projectId: string) {
  const admin = createAdminClient();
  const { data: project, error } = await admin
    .from("projects")
    .select("timezone")
    .eq("id", projectId)
    .single();
  if (error || !project) throw new Error("Dashboard não encontrada.");
  const end = dateInZone(new Date().toISOString(), project.timezone);
  const { data: rules, error: re } = await admin
    .from("automation_rules")
    .select("*")
    .eq("project_id", projectId)
    .eq("enabled", true);
  if (re) throw new Error(re.message);
  let notices = 0;
  const cache = new Map<
    number,
    Awaited<ReturnType<typeof loadSystemWorkspace>>
  >();
  for (const rule of rules || []) {
    const days = Number(rule.window_days),
      start = new Date(Date.parse(end + "T12:00:00Z") - (days - 1) * 86400000)
        .toISOString()
        .slice(0, 10);
    if (!cache.has(days))
      cache.set(days, await loadSystemWorkspace(projectId, start, end));
    const data = cache.get(days)!;
    const summary = aggregate(data);
    const value =
      rule.metric === "integration_errors"
        ? data.webhookEvents.filter(
            (e) =>
              e.status === "error" &&
              dateInZone(s(e, "received_at"), project.timezone) >= start,
          ).length
        : summary[
            rule.metric as "roi" | "revenue" | "profit" | "sales" | "untracked"
          ];
    if (value !== null && value !== undefined) {
      const threshold = Number(rule.threshold);
      const matches =
        rule.operator === "gt"
          ? value > threshold
          : rule.operator === "gte"
            ? value >= threshold
            : rule.operator === "lt"
              ? value < threshold
              : value <= threshold;
      if (matches) {
        await createNotice(
          projectId,
          "rule",
          rule.name,
          `${({ roi: "ROI", profit: "Lucro", revenue: "Faturamento", sales: "Vendas", untracked: "Não rastreadas", integration_errors: "Falhas de integração" } as Record<string, string>)[rule.metric] || rule.metric}: ${Number(value).toLocaleString("pt-BR")} · janela de ${days} dia(s).`,
          "rule:" + rule.id + ":" + end,
        );
        notices++;
      }
    }
    const { error: updateError } = await admin
      .from("automation_rules")
      .update({ last_evaluated_at: new Date().toISOString() })
      .eq("id", rule.id)
      .eq("project_id", projectId);
    if (updateError) throw new Error(updateError.message);
  }
  return { evaluated: rules?.length || 0, matched: notices };
}
export async function createSaleNotice(projectId: string, orderId: string) {
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id,name,owner_id")
    .eq("id", projectId)
    .single();
  const { data: order } = await admin
    .from("orders")
    .select("id,status,currency,gross_amount,commission_amount,utm_campaign")
    .eq("id", orderId)
    .eq("project_id", projectId)
    .single();
  if (!project || !order) return;
  const { data: pref } = await admin
    .from("user_project_preferences")
    .select("preferences")
    .eq("project_id", projectId)
    .eq("user_id", project.owner_id)
    .maybeSingle();
  const settings = object(object(pref?.preferences).notifications);
  if (
    (order.status === "paid" && settings.approved === false) ||
    (order.status === "pending" && settings.pending !== true) ||
    !["paid", "pending"].includes(order.status)
  )
    return;
  const amount =
    settings.value === "hidden"
      ? ""
      : settings.value === "commission"
        ? order.commission_amount == null
          ? "Comissão não informada"
          : `Comissão: ${order.currency} ${order.commission_amount}`
        : `${order.currency} ${order.gross_amount}`;
  const parts = [
    amount,
    settings.product === false ? "" : project.name,
    settings.campaign === true && order.utm_campaign ? order.utm_campaign : "",
    settings.dashboard === false ? "" : "Dashboard " + project.name,
  ].filter(Boolean);
  await createNotice(
    projectId,
    "sale",
    order.status === "paid" ? "Venda aprovada!" : "Venda pendente",
    parts.join(" · "),
    "sale:" + orderId + ":" + order.status,
  );
}
export async function scheduledReports() {
  const admin = createAdminClient();
  const { data: projects, error } = await admin
    .from("projects")
    .select("id,name,timezone,owner_id")
    .eq("status", "active");
  if (error) throw new Error(error.message);
  let reports = 0;
  for (const project of projects || []) {
    const { data: pref } = await admin
      .from("user_project_preferences")
      .select("preferences")
      .eq("project_id", project.id)
      .eq("user_id", project.owner_id)
      .maybeSingle();
    const settings = object(object(pref?.preferences).notifications);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: project.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(new Date())
      .split(":");
    const minutes = Number(parts[0]) * 60 + Number(parts[1]),
      end = dateInZone(new Date().toISOString(), project.timezone);
    for (const hour of strings(settings.hours)) {
      const [h, m] = hour.split(":").map(Number);
      if (minutes < h * 60 + m || minutes > h * 60 + m + 14) continue;
      const data = await loadSystemWorkspace(project.id, end, end),
        summary = aggregate(data);
      const money = (v: number) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const body =
        settings.style === "detail"
          ? `Faturamento ${money(summary.revenue)} · Lucro ${money(summary.profit)} · ${summary.sales} vendas.`
          : settings.style === "profit"
            ? `Lucro: ${money(summary.profit)}`
            : `Sua operação já gerou ${money(summary.profit)} de lucro hoje. Confira sua dashboard.`;
      await createNotice(
        project.id,
        "report",
        "Resumo · " + project.name,
        body,
        "report:" + end + ":" + hour,
      );
      reports++;
    }
    await evaluateProjectRules(project.id);
  }
  return { reports };
}
export async function queueConversions(projectId: string, orderId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("status,paid_at")
    .eq("id", orderId)
    .eq("project_id", projectId)
    .single();
  if (order?.status !== "paid" || !order.paid_at) return;
  const { data: pixels, error } = await admin
    .from("integrations")
    .select("id,provider")
    .eq("project_id", projectId)
    .eq("integration_type", "pixel")
    .neq("status", "disabled");
  if (error) throw new Error(error.message);
  for (const pixel of pixels || []) {
    const { error: e } = await admin.from("conversion_deliveries").upsert(
      {
        project_id: projectId,
        integration_id: pixel.id,
        order_id: orderId,
        event_id: "tf_purchase_" + orderId,
        provider: pixel.provider,
        status: "pending",
      },
      { onConflict: "integration_id,event_id", ignoreDuplicates: true },
    );
    if (e) throw new Error(e.message);
  }
}
