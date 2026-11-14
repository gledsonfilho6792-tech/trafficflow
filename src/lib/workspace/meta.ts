import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncMetaStructure } from "@/lib/meta/sync-structure";
import { syncMetaInsights } from "@/lib/meta/sync-insights";
export async function metaCredential(projectId: string) {
  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("integrations")
    .select("id,status")
    .eq("project_id", projectId)
    .eq("provider", "meta")
    .eq("integration_type", "ads")
    .maybeSingle();
  if (error || !integration || integration.status === "disabled")
    throw new Error("Conecte a Meta nesta dashboard.");
  const { data: token, error: se } = await admin.rpc("get_integration_secret", {
    p_integration_id: integration.id,
  });
  if (se || !token || typeof token !== "string")
    throw new Error(
      "A credencial Meta não está disponível. Reconecte a conta.",
    );
  return { admin, integration, token };
}
export async function metaGet(path: string, token: string) {
  const response = await fetch(
    `https://graph.facebook.com/${process.env.META_API_VERSION || "v26.0"}/${path}`,
    {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  const data = await response.json();
  if (!response.ok || data.error)
    throw new Error(data.error?.message || "Falha ao consultar a Meta.");
  return data;
}
export async function syncWorkspaceMeta(
  projectId: string,
  start: string,
  end: string,
  includeStructure = true,
) {
  const { admin, integration, token } = await metaCredential(projectId);
  const { data: accounts, error } = await admin
    .from("ad_accounts")
    .select("id,external_id,currency")
    .eq("project_id", projectId)
    .eq("integration_id", integration.id)
    .eq("is_active", true);
  if (error || !accounts?.length)
    throw new Error("Vincule ao menos uma conta de anúncio.");
  const results = [];
  for (const account of accounts) {
    const structure = includeStructure
      ? await syncMetaStructure({
          projectId,
          adAccountId: account.id,
          adAccountExternalId: account.external_id,
          accessToken: token,
        })
      : null;
    const insights = await syncMetaInsights({
      projectId,
      adAccountId: account.id,
      adAccountExternalId: account.external_id,
      adAccountCurrency: account.currency,
      accessToken: token,
      startDate: start,
      endDate: end,
    });
    results.push({ accountId: account.id, structure, insights });
  }
  const { error: updated } = await admin
    .from("integrations")
    .update({ last_synced_at: new Date().toISOString(), status: "connected" })
    .eq("id", integration.id);
  if (updated) throw new Error(updated.message);
  return results;
}
