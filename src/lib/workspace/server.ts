import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateWindow } from "./analytics";
import {
  object,
  strings,
  type Row,
  type WorkspaceData,
  type Project,
} from "./types";
export async function authorize(projectId: string) {
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(projectId))
    throw new Error("400:Dashboard inválida.");
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error("401:Faça login novamente.");
  const { data: project, error: pe } = await client
    .from("projects")
    .select("id,name,timezone,base_currency")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (pe || !project) throw new Error("404:Dashboard não encontrada.");
  return { client, admin: createAdminClient(), user, project };
}
type Chunk = { data: unknown[] | null; error: { message: string } | null };
export async function allRows(
  query: (from: number, to: number) => PromiseLike<Chunk>,
): Promise<Row[]> {
  const result: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(error.message);
    result.push(...((data || []) as Row[]));
    if (!data || data.length < 1000) break;
    if (from >= 199000)
      throw new Error(
        "Volume excede o limite desta consulta. Reduza o período.",
      );
  }
  return result;
}
export async function loadWorkspace(
  projectId: string,
  start: string,
  end: string,
): Promise<WorkspaceData> {
  return readWorkspace(await authorize(projectId), start, end);
}
export async function loadSystemWorkspace(
  projectId: string,
  start: string,
  end: string,
): Promise<WorkspaceData> {
  const admin = createAdminClient();
  const { data: project, error } = await admin
    .from("projects")
    .select("id,name,timezone,base_currency,owner_id")
    .eq("id", projectId)
    .single();
  if (error || !project) throw new Error("Dashboard não encontrada.");
  return readWorkspace(
    { admin, client: admin, user: { id: project.owner_id }, project },
    start,
    end,
  );
}
async function readWorkspace(
  {
    admin,
    user,
    project,
    client,
  }: {
    admin: ReturnType<typeof createAdminClient>;
    client: ReturnType<typeof createAdminClient>;
    user: { id: string };
    project: Project;
  },
  start: string,
  end: string,
): Promise<WorkspaceData> {
  dateWindow(start, end);
  const projectId = project.id;
  const rows = (table: string, columns = "*") =>
    allRows((a, b) =>
      admin
        .from(table)
        .select(columns)
        .eq("project_id", projectId)
        .order("id")
        .range(a, b),
    );
  const dated = (table: string, column: string, columns = "*") =>
    allRows((a, b) =>
      admin
        .from(table)
        .select(columns)
        .eq("project_id", projectId)
        .gte(column, start)
        .lte(column, end)
        .order("id")
        .range(a, b),
    );
  const results = await Promise.all([
    client
      .from("projects")
      .select("id,name,timezone,base_currency")
      .eq("owner_id", user.id)
      .order("name"),
    admin
      .from("project_settings")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle(),
    admin
      .from("user_project_preferences")
      .select("preferences")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle(),
    rows("ad_accounts"),
    rows("campaigns"),
    rows("ad_sets"),
    rows("ads"),
    dated("ad_insights_daily", "metric_date"),
    rows(
      "orders",
      "id,provider,status,currency,gross_amount,net_amount,paid_at,provider_created_at,created_at,offer_code,customer_country,customer_state,customer_city,tracking_session_id,tracking_source_id,attribution_token,attribution_method,utm_source,utm_medium,utm_campaign,payment_method",
    ),
    rows(
      "tracking_sessions",
      "id,campaign_id,ad_set_id,ad_id,utm_source,utm_medium,utm_campaign,started_at,session_id",
    ),
    allRows((a, b) =>
      admin
        .from("tracking_events")
        .select("id,event_name,tracking_session_id,occurred_at,metadata")
        .eq("project_id", projectId)
        .gte("occurred_at", start + "T00:00:00Z")
        .lt(
          "occurred_at",
          new Date(Date.parse(end + "T00:00:00Z") + 2 * 86400000).toISOString(),
        )
        .order("id")
        .range(a, b),
    ),
    dated("finance_expenses", "occurred_on"),
    rows(
      "integrations",
      "id,provider,integration_type,name,status,config,last_synced_at",
    ),
    allRows((a, b) =>
      admin
        .from("webhook_events")
        .select(
          "id,provider,event_type,status,received_at,processed_at,error_message",
        )
        .eq("project_id", projectId)
        .order("received_at", { ascending: false })
        .range(a, b),
    ),
    dated("cash_entries", "occurred_on"),
    rows("finance_commitments"),
    rows("automation_rules"),
    allRows((a, b) =>
      admin
        .from("app_notifications")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(a, b),
    ),
    rows(
      "project_api_keys",
      "id,name,scopes,revoked_at,created_at,last_used_at",
    ),
    rows(
      "conversion_deliveries",
      "id,provider,event_id,status,attempts,last_error,sent_at,created_at",
    ),
  ]);
  for (const r of results.slice(0, 3))
    if (!Array.isArray(r) && r.error) throw new Error(r.error.message);
  const [pr, settings, prefs, ...tables] = results;
  const data = tables as Row[][];
  const integrations:Row[] = data[9].map((i) => ({
    ...i,
    config: Object.fromEntries(
      Object.entries(object(i.config)).filter(([k]) =>
        [
          "product_ids",
          "product_id",
          "offer_code",
          "webhook_token_configured",
          "pixel_id",
          "client_id",
          "api_configured",
          "api_verified_at",
          "api_enabled",
          "campaign_scope",
          "configured",
          "last_test_at",
        ].includes(k),
      ),
    ),
  }));
  return {
    project,
    projects: !Array.isArray(pr) ? pr.data || [] : [],
    settings: (!Array.isArray(settings) ? settings.data : null) || {
      id: projectId,
      project_id: projectId,
      campaign_ids: [],
      campaign_scope: "selected",
    },
    preferences: object(!Array.isArray(prefs) ? prefs.data?.preferences : {}),
    accounts: data[0],
    campaigns: data[1],
    adsets: data[2],
    ads: data[3],
    insights: data[4],
    orders: data[5],
    sessions: data[6],
    events: data[7],
    expenses: data[8],
    integrations,
    webhookEvents: data[10],
    cash: data[11],
    commitments: data[12],
    rules: data[13],
    notifications: data[14],
    apiKeys: data[15],
    deliveries: data[16],
    period: { start, end },
    warnings: integrations.some(
      (i) =>
        i.integration_type === "checkout" &&
        ["applyfy", "hotmart", "cakto"].includes(String(i.provider)) &&
        !strings(object(i.config).product_ids).length,
    )
      ? [
          "Configure os IDs dos produtos em Integrações → Webhooks. O recebimento fica bloqueado até vincular os produtos à oferta correta.",
        ]
      : [],
  };
}
