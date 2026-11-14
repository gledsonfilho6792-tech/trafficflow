import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/workspace/server";
import { object } from "@/lib/workspace/types";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { admin } = await authorize(body.projectId);
    const { data: i, error } = await admin
      .from("integrations")
      .select("id,provider,integration_type,config,status")
      .eq("id", body.id)
      .eq("project_id", body.projectId)
      .single();
    if (error || !i || i.status === "disabled")
      throw Error("Integração indisponível.");
    const { data: stored, error: se } = await admin.rpc(
      "get_integration_secret",
      { p_integration_id: i.id },
    );
    if (se || !stored) throw Error("Credencial não configurada.");
    const credentials = object(JSON.parse(String(stored)));
    if (i.provider === "hotmart" && i.integration_type === "checkout") {
      if (
        !credentials.client_id ||
        !credentials.client_secret ||
        !credentials.basic
      )
        throw Error("Configure as credenciais de API Hotmart.");
      const basic = String(credentials.basic).replace(/^Basic\s+/i, "");
      if (!/^[a-zA-Z0-9+/=]+$/.test(basic)) throw Error("Basic inválido.");
      const r = await fetch(
        "https://api-sec-vlc.hotmart.com/security/oauth/token",
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + basic,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: String(credentials.client_id),
            client_secret: String(credentials.client_secret),
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const d = await r.json();
      if (!r.ok || !d.access_token)
        throw Error(
          "Hotmart não validou as credenciais. Confira Client ID, Client Secret e Basic.",
        );
    } else if (i.provider === "meta" && i.integration_type === "pixel") {
      const config = object(i.config);
      if (
        !/^\d{5,30}$/.test(String(config.pixel_id)) ||
        !credentials.access_token
      )
        throw Error("Configure Pixel e token CAPI.");
      const r = await fetch(
        `https://graph.facebook.com/${process.env.META_API_VERSION || "v26.0"}/${config.pixel_id}?fields=id,name`,
        {
          headers: { Authorization: "Bearer " + credentials.access_token },
          signal: AbortSignal.timeout(15000),
        },
      );
      const d = await r.json();
      if (!r.ok || !d.id)
        throw Error(
          "Meta não confirmou acesso ao Pixel. Confira o ID e o token.",
        );
    } else
      throw Error(
        "Esta conexão é validada pelo recebimento de um webhook real.",
      );
    const { error: ue } = await admin
      .from("integrations")
      .update({
        config: {
          ...object(i.config),
          api_verified_at: new Date().toISOString(),
        },
      })
      .eq("id", i.id)
      .eq("project_id", body.projectId);
    if (ue)
      throw Error(
        "Acesso confirmado, mas não foi possível registrar o resultado.",
      );
    return NextResponse.json({
      ok: true,
      message:
        "Acesso à API confirmado. Webhooks e conversões continuam dependendo da validação de eventos.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Falha ao testar conexão.",
      },
      { status: 400 },
    );
  }
}
