import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/workspace/server";
import {
  metaCredential,
  metaGet,
  syncWorkspaceMeta,
} from "@/lib/workspace/meta";
import { dateWindow } from "@/lib/workspace/analytics";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("projectId") || "";
    await authorize(id);
    const { token } = await metaCredential(id);
    const accounts = [];
    let path =
      "me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name&limit=100";
    for (let i = 0; i < 100; i++) {
      const result = await metaGet(path, token);
      accounts.push(...(result.data || []));
      if (!result.paging?.cursors?.after || !result.paging?.next) break;
      path =
        "me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name&limit=100&after=" +
        encodeURIComponent(result.paging.cursors.after);
    }
    return NextResponse.json({ ok: true, accounts });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Falha ao consultar contas.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: message.startsWith("401:") ? 401 : 400 },
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { admin } = await authorize(body.projectId);
    if (body.action === "sync") {
      dateWindow(body.start, body.end);
      const result = await syncWorkspaceMeta(
        body.projectId,
        body.start,
        body.end,
      );
      return NextResponse.json({ ok: true, result });
    }
    const { token, integration } = await metaCredential(body.projectId);
    if (body.action === "link") {
      if (!/^act_\d+$/.test(String(body.accountId)))
        throw new Error("Conta inválida.");
      const a = await metaGet(
        String(body.accountId) +
          "?fields=id,account_id,name,account_status,currency,timezone_name",
        token,
      );
      const { data, error } = await admin
        .from("ad_accounts")
        .upsert(
          {
            project_id: body.projectId,
            integration_id: integration.id,
            provider: "meta",
            external_id: a.id,
            account_id: a.account_id,
            name: a.name,
            account_status: a.account_status,
            currency: a.currency,
            timezone_name: a.timezone_name,
            is_active: true,
          },
          { onConflict: "integration_id,external_id" },
        )
        .select("id,name")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, account: data });
    }
    if (body.action === "unlink") {
      const { error } = await admin
        .from("ad_accounts")
        .update({ is_active: false })
        .eq("id", body.accountId)
        .eq("project_id", body.projectId)
        .eq("integration_id", integration.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    throw new Error("Ação inválida.");
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha na operação Meta.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: message.startsWith("401:") ? 401 : 400 },
    );
  }
}
