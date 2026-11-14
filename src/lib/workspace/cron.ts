import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncWorkspaceMeta } from "./meta";
import { dateInZone } from "./analytics";
import { scheduledReports } from "./automation";
import { deliverConversions } from "./conversions";
export async function runWorkspaceAutomation(
  request: NextRequest,
  mode: "hot" | "full",
) {
  if (!process.env.AUTOMATION_SECRET)
    return NextResponse.json(
      { ok: false, error: "Automação não configurada." },
      { status: 503 },
    );
  if (
    request.headers.get("authorization") !==
    "Bearer " + process.env.AUTOMATION_SECRET
  )
    return NextResponse.json(
      { ok: false, error: "Não autorizado." },
      { status: 401 },
    );
  const admin = createAdminClient();
  const { data: integrations, error } = await admin
    .from("integrations")
    .select("id,project_id")
    .eq("provider", "meta")
    .eq("integration_type", "ads")
    .eq("status", "connected");
  if (error)
    return NextResponse.json(
      { ok: false, error: "Não foi possível consultar integrações." },
      { status: 500 },
    );
  const results = [];
  for (const integration of integrations || []) {
    let runId: string | null = null;
    try {
      const { data: project } = await admin
        .from("projects")
        .select("timezone")
        .eq("id", integration.project_id)
        .single();
      if (!project) throw new Error("Dashboard não encontrada.");
      const today = dateInZone(new Date().toISOString(), project.timezone);
      const { data: run, error: re } = await admin
        .from("sync_runs")
        .insert({
          project_id: integration.project_id,
          integration_id: integration.id,
          provider: "meta",
          sync_type: mode,
          triggered_by: "cron",
          status: "running",
          period_start: today,
          period_end: today,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (re || !run) throw new Error("Não foi possível iniciar o histórico.");
      runId = run.id;
      const accounts = await syncWorkspaceMeta(
        integration.project_id,
        today,
        today,
        mode === "full",
      );
      const received = accounts.reduce(
          (sum, a) => sum + Number(a.insights.totalReceived || 0),
          0,
        ),
        saved = accounts.reduce(
          (sum, a) => sum + Number(a.insights.totalSaved || 0),
          0,
        );
      await admin
        .from("sync_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          records_received: received,
          records_saved: saved,
          metadata: { accounts: accounts.length },
        })
        .eq("id", runId);
      results.push({
        projectId: integration.project_id,
        status: "success",
        received,
        saved,
        accounts: accounts.length,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Falha na sincronização.";
      if (runId)
        await admin
          .from("sync_runs")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            error_message: message,
          })
          .eq("id", runId);
      results.push({
        projectId: integration.project_id,
        status: "error",
        error: message,
      });
    }
  }
  let reports: unknown = null,
    conversions: unknown = null;
  const errors: string[] = [];
  if (mode === "hot") {
    try {
      reports = await scheduledReports();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Falha nos relatórios.");
    }
    try {
      conversions = await deliverConversions();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Falha nas conversões.");
    }
  }
  return NextResponse.json({
    ok: !errors.length && results.every((r) => r.status === "success"),
    mode,
    projectsProcessed: results.length,
    results,
    reports,
    conversions,
    errors,
  });
}
