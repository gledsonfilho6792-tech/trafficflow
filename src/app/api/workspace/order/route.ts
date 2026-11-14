import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/workspace/server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const { admin } = await authorize(p.get("projectId") || "");
    const { data: order, error } = await admin
      .from("orders")
      .select(
        "id,external_order_id,provider,status,currency,gross_amount,net_amount,paid_at,provider_created_at,payment_method,offer_code,utm_source,utm_medium,utm_campaign,utm_content,utm_term,tracking_session_id,attribution_method,attribution_token,tracking_data",
      )
      .eq("id", p.get("orderId") || "")
      .eq("project_id", p.get("projectId") || "")
      .maybeSingle();
    if (error || !order)
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    const [items, events] = await Promise.all([
      admin
        .from("order_items")
        .select(
          "id,product_name,external_product_id,quantity,unit_price,total_amount",
        )
        .eq("order_id", order.id),
      admin
        .from("order_events")
        .select("id,event_type,normalized_status,event_at")
        .eq("order_id", order.id)
        .eq("project_id", p.get("projectId") || "")
        .order("event_at"),
    ]);
    if (items.error || events.error)
      throw new Error("Não foi possível ler os detalhes.");
    return NextResponse.json({ order, items: items.data, events: events.data });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Falha ao carregar pedido.";
    return NextResponse.json(
      { error: m.replace(/^\d{3}:/, "") },
      { status: m.startsWith("401:") ? 401 : 400 },
    );
  }
}
