import { validatePreferences } from "@/lib/workspace/preferences";
import { evaluateProjectRules } from "@/lib/workspace/automation";
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { authorize } from "@/lib/workspace/server";
import { object, strings } from "@/lib/workspace/types";
import { validDate } from "@/lib/workspace/analytics";
export const dynamic = "force-dynamic";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
function name(value: unknown) {
  if (
    typeof value !== "string" ||
    value.trim().length < 1 ||
    value.length > 160
  )
    throw new Error("Nome inválido.");
  return value.trim();
}
function amount(value: unknown) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0 || v > 1e10)
    throw new Error("Valor inválido.");
  return Math.round(v * 100) / 100;
}
function day(value: unknown) {
  if (typeof value !== "string" || !validDate(value))
    throw new Error("Data inválida.");
  return value;
}
function uuid(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
  )
    throw new Error("Identificador inválido.");
  return value;
}
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > 40000) throw new Error("Conteúdo muito grande.");
    const body = JSON.parse(raw);
    const projectId = uuid(body.projectId),
      action = String(body.action),
      input = object(body.input);
    const { admin, client, user, project } = await authorize(projectId);
    let result: unknown = null;
    const save = async (
      table: string,
      row: Record<string, unknown>,
      id?: string,
    ) => {
      const q = id
        ? admin.from(table).update(row).eq("id", id).eq("project_id", projectId)
        : admin.from(table).insert({ ...row, project_id: projectId });
      const { data, error } = await q.select().single();
      if (error) throw new Error("Não foi possível salvar: " + error.message);
      return data;
    };
    if (action === "preferences") {
      const changes = validatePreferences(input);
      const { data: old } = await admin
        .from("user_project_preferences")
        .select("preferences")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();
      const { error } = await admin.from("user_project_preferences").upsert({
        project_id: projectId,
        user_id: user.id,
        preferences: { ...object(old?.preferences), ...changes },
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    } else if (action === "settings") {
      const ids = strings(input.campaign_ids).map(uuid);
      if (ids.length) {
        const { data, error } = await admin
          .from("campaigns")
          .select("id")
          .eq("project_id", projectId)
          .in("id", ids);
        if (error || data?.length !== new Set(ids).size)
          throw new Error("Campanha não pertence a esta dashboard.");
      }
      if (ids.length) {
        const { data: owned, error: ownedError } = await client
          .from("projects")
          .select("id")
          .eq("owner_id", user.id)
          .neq("id", projectId);
        if (ownedError)
          throw Error("Não foi possível conferir os vínculos de ofertas.");
        const otherIds = (owned || []).map((p) => p.id);
        if (otherIds.length) {
          const { data: settings, error: scopeError } = await admin
            .from("project_settings")
            .select("campaign_ids")
            .in("project_id", otherIds);
          if (scopeError)
            throw Error("Não foi possível conferir os vínculos de ofertas.");
          const assigned = (settings || []).flatMap((r) =>
            strings(r.campaign_ids),
          );
          if (assigned.length) {
            const [current, others] = await Promise.all([
              admin
                .from("campaigns")
                .select("external_id")
                .eq("project_id", projectId)
                .in("id", ids),
              admin
                .from("campaigns")
                .select("external_id")
                .in("project_id", otherIds)
                .in("id", assigned),
            ]);
            if (current.error || others.error)
              throw Error(
                "Não foi possível conferir campanhas compartilhadas.",
              );
            const external = new Set(
              (others.data || []).map((c) => c.external_id),
            );
            if ((current.data || []).some((c) => external.has(c.external_id)))
              throw Error(
                "Uma campanha selecionada já está vinculada a outra oferta. Desvincule-a da outra dashboard para evitar duplicar investimento.",
              );
          }
        }
      }
      for (const key of ["sales_page_url", "checkout_url"])
        if (input[key]) {
          const u = new URL(String(input[key]));
          if (u.protocol !== "https:") throw new Error("Use uma URL HTTPS.");
        }
      const goal = Number(input.goal || 0);
      if (!Number.isFinite(goal) || goal < 0) throw new Error("Meta inválida.");
      const { error } = await admin.from("project_settings").upsert({
        project_id: projectId,
        product_name: name(input.product_name || project.name),
        sales_page_url: String(input.sales_page_url || ""),
        checkout_url: String(input.checkout_url || ""),
        goal,
        product_ids: strings(input.product_ids),
        campaign_ids: ids,
        campaign_scope: "selected",
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    } else if (action === "cash" || action === "commitment") {
      if (!["income", "expense"].includes(String(input.direction)))
        throw new Error("Tipo inválido.");
      result = await save(
        action === "cash" ? "cash_entries" : "finance_commitments",
        {
          name: name(input.name),
          amount: amount(input.amount),
          direction: input.direction,
          currency: "BRL",
          category: String(input.category || "other").slice(0, 80),
          [action === "cash" ? "occurred_on" : "due_on"]: day(input.date),
        },
      );
    } else if (action === "settle") {
      if (typeof input.paid !== "boolean")
        throw new Error("Situação inválida.");
      const id = uuid(input.id);
      const { data: row } = await client
        .from("finance_commitments")
        .select("id")
        .eq("id", id)
        .eq("project_id", projectId)
        .maybeSingle();
      if (!row) throw new Error("Compromisso não encontrado.");
      const { data, error } = await client.rpc("settle_finance_commitment", {
        p_id: id,
        p_paid: input.paid,
      });
      if (error) throw new Error(error.message);
      result = data;
    } else if (action === "deleteCash") {
      const id = uuid(input.id);
      const { data: row } = await admin
        .from("cash_entries")
        .select("commitment_id")
        .eq("id", id)
        .eq("project_id", projectId)
        .maybeSingle();
      if (!row || row.commitment_id)
        throw new Error("Desfaça a baixa pelo compromisso correspondente.");
      const { error } = await admin
        .from("cash_entries")
        .delete()
        .eq("id", id)
        .eq("project_id", projectId);
      if (error) throw new Error(error.message);
    } else if (action === "rule") {
      if (
        ![
          "roi",
          "profit",
          "revenue",
          "sales",
          "untracked",
          "integration_errors",
        ].includes(String(input.metric)) ||
        !["lt", "lte", "gt", "gte"].includes(String(input.operator))
      )
        throw new Error("Condição inválida.");
      const threshold = Number(input.threshold),
        window = Number(input.window_days);
      if (
        !Number.isFinite(threshold) ||
        !Number.isInteger(window) ||
        window < 1 ||
        window > 30
      )
        throw new Error("Limite ou janela inválidos.");
      result = await save(
        "automation_rules",
        {
          name: name(input.name),
          metric: input.metric,
          operator: input.operator,
          threshold,
          window_days: window,
          enabled: input.enabled !== false,
        },
        input.id ? uuid(input.id) : undefined,
      );
    } else if (action === "evaluateRules") {
      result = await evaluateProjectRules(projectId);
    } else if (action === "toggleRule") {
      if (typeof input.enabled !== "boolean")
        throw new Error("Estado inválido.");
      result = await save(
        "automation_rules",
        { enabled: input.enabled },
        uuid(input.id),
      );
    } else if (action === "readNotifications") {
      let q = admin
        .from("app_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("project_id", projectId)
        .eq("user_id", user.id);
      if (input.id) q = q.eq("id", uuid(input.id));
      const { error } = await q;
      if (error) throw new Error(error.message);
    } else if (action === "createApiKey") {
      const token = "tf_" + randomBytes(32).toString("hex");
      const { data, error } = await admin
        .from("project_api_keys")
        .insert({
          project_id: projectId,
          name: name(input.name),
          token_hash: hash(token),
          scopes: ["reports:read"],
        })
        .select("id,name,scopes,created_at")
        .single();
      if (error) throw new Error(error.message);
      result = { ...data, token };
    } else if (action === "revokeApiKey") {
      result = await save(
        "project_api_keys",
        { revoked_at: new Date().toISOString() },
        uuid(input.id),
      );
      result = { revoked: true };
    } else if (action === "integration") {
      const provider = String(input.provider),
        type = String(input.type);
      if (type === "pixel" && provider !== "meta")
        throw new Error("Pixel não suportado.");
      if (
        !["applyfy", "hotmart", "kiwify", "cakto", "meta"].includes(provider) ||
        !["checkout", "pixel"].includes(type) ||
        (provider === "meta" && type !== "pixel")
      )
        throw new Error("Provedor ainda não implementado.");
      const { data: old, error: readError } = await admin
        .from("integrations")
        .select("id,config,status")
        .eq("project_id", projectId)
        .eq("provider", provider)
        .eq("integration_type", type)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      const config: Record<string, unknown> = {
        ...object(old?.config),
        product_ids: strings(input.product_ids),
        offer_code: String(input.offer_code || ""),
        configured: true,
      };
      const secret = String(input.webhookToken || "").trim();
      if (type === "checkout" && !secret && !config.webhook_token_sha256)
        throw new Error("Informe o token de validação do webhook.");
      if (secret)
        Object.assign(config, {
          webhook_token_sha256: hash(secret),
          webhook_token_configured: true,
        });
      if (provider === "kiwify")
        throw new Error(
          "A ativação Kiwify depende da validação do contrato de assinatura do checkout.",
        );
      if (type === "pixel") {
        if (!/^\d{5,30}$/.test(String(input.pixel_id)))
          throw new Error("ID do Pixel inválido.");
        Object.assign(config, { pixel_id: String(input.pixel_id) });
      }
      const credentials = object(input.credentials);
      if (provider === "cakto" && secret) credentials.webhook_secret = secret;
      if (
        provider === "hotmart" &&
        Object.keys(credentials).length &&
        (!credentials.client_id ||
          !credentials.client_secret ||
          !credentials.basic)
      )
        throw new Error("Preencha Client ID, Client Secret e Basic.");
      if (
        Object.keys(credentials).length &&
        provider !== "hotmart" &&
        provider !== "cakto" &&
        type !== "pixel"
      )
        throw new Error("Credencial não suportada.");
      if (
        type === "pixel" &&
        !credentials.access_token &&
        !object(old?.config).api_configured
      )
        throw new Error("Informe o token de acesso CAPI.");
      const stored = await save(
        "integrations",
        {
          name: name(input.name),
          provider,
          integration_type: type,
          config,
          status: old?.status === "connected" ? "connected" : "disconnected",
        },
        old?.id,
      );
      if (Object.keys(credentials).length) {
        if (provider !== "hotmart" && provider !== "cakto" && type !== "pixel")
          throw new Error("Credencial não suportada.");
        if (
          provider === "hotmart" &&
          (!credentials.client_id ||
            !credentials.client_secret ||
            !credentials.basic)
        )
          throw new Error("Preencha Client ID, Client Secret e Basic.");
        const { error } = await client.rpc("store_integration_secret", {
          p_integration_id: stored.id,
          p_secret: JSON.stringify(credentials),
        });
        if (error)
          throw new Error("Falha ao armazenar credenciais protegidas.");
        await admin
          .from("integrations")
          .update({ config: { ...config, api_configured: true } })
          .eq("id", stored.id)
          .eq("project_id", projectId);
      }
      result = {
        id: stored.id,
        configured: true,
        webhookUrl:
          (process.env.TRAFFIC_FLOW_PUBLIC_URL || request.nextUrl.origin) +
          "/api/webhooks/" +
          provider +
          "/" +
          stored.id,
      };
    } else if (action === "disableIntegration") {
      result = await save(
        "integrations",
        { status: "disabled" },
        uuid(input.id),
      );
    } else throw new Error("Ação inválida.");
    const { error: auditError } = await admin.from("workspace_audit").insert({
      project_id: projectId,
      actor_id: user.id,
      action,
      entity_id:
        typeof object(result).id === "string" ? object(result).id : null,
    });
    if (auditError)
      console.error("Workspace audit write failed", auditError.code);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar.";
    const match = /^(400|401|404):/.exec(message);
    return NextResponse.json(
      { ok: false, error: message.replace(/^\d{3}:/, "") },
      { status: match ? Number(match[1]) : 400 },
    );
  }
}
