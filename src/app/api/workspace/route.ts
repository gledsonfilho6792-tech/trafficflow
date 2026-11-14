import { NextRequest, NextResponse } from "next/server";
import { loadWorkspace } from "@/lib/workspace/server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    return NextResponse.json({
      ok: true,
      data: await loadWorkspace(
        p.get("projectId") || "",
        p.get("start") || "",
        p.get("end") || "",
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao carregar a operação.";
    const match = /^(400|401|404):/.exec(message);
    return NextResponse.json(
      { ok: false, error: message.replace(/^\d{3}:/, "") },
      { status: match ? Number(match[1]) : 500 },
    );
  }
}
