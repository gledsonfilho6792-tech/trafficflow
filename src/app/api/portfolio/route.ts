import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadSystemWorkspace } from "@/lib/workspace/server";
import { aggregate, dateWindow } from "@/lib/workspace/analytics";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Faça login." }, { status: 401 });
  try {
    const start = request.nextUrl.searchParams.get("start") || "",
      end = request.nextUrl.searchParams.get("end") || "";
    dateWindow(start, end);
    const { data: projects, error } = await client
      .from("projects")
      .select("id,name,timezone,base_currency,status")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const results = [];
    for (const project of projects || []) {
      const data = await loadSystemWorkspace(project.id, start, end);
      const { investment, revenue, costs, profit, roi, roas, margin, sales } =
        aggregate(data);
      results.push({
        ...project,
        investment,
        revenue,
        costs,
        profit,
        roi,
        roas,
        margin,
        sales,
      });
    }
    return NextResponse.json({ ok: true, projects: results });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Falha ao carregar portfólio.",
      },
      { status: 400 },
    );
  }
}
export async function POST(request: NextRequest) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Faça login." }, { status: 401 });
  try {
    const body = await request.json();
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 160
    )
      throw new Error("Informe um nome de até 160 caracteres.");
    const slug =
      body.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      crypto.randomUUID().slice(0, 6);
    const { data, error } = await client
      .from("projects")
      .insert({
        owner_id: user.id,
        name: body.name.trim(),
        slug,
        timezone: "America/Fortaleza",
        base_currency: "BRL",
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, project: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao criar dashboard." },
      { status: 400 },
    );
  }
}
