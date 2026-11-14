"use client";
import { useEffect, useState } from "react";
import {
  object,
  text as s,
  numeric as n,
  type Row,
} from "@/lib/workspace/types";
import { attribution } from "@/lib/workspace/analytics";
import { SimpleTable, Empty, Badge } from "./primitives";
export function OrderDetails({
  projectId,
  order,
  timezone,
}: {
  projectId: string;
  order: Row;
  timezone: string;
}) {
  const [detail, setDetail] = useState<{
      order: Row;
      items: Row[];
      events: Row[];
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(
      "/api/workspace/order?" +
        new URLSearchParams({ projectId, orderId: order.id }),
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (active) setDetail(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [projectId, order.id]);
  const o = detail?.order || order,
    tracking = attribution(o),
    classifications: Record<string, string> = {
      main: "Principal",
      orderbump: "Order bump",
      upsell: "Upsell",
      downsell: "Downsell",
    };
  return (
    <>
      <div className="tf-status-line">
        <Badge tone={o.status === "paid" ? "green" : "default"}>
          {s(o, "status") === "paid" ? "Aprovada" : s(o, "status")}
        </Badge>
        <Badge tone={tracking === "untracked" ? "red" : "default"}>
          {tracking === "tracked"
            ? "Rastreada"
            : tracking === "pending"
              ? "Origem a confirmar"
              : "Não rastreada"}
        </Badge>
      </div>
      <dl className="tf-details">
        <dt>Pedido no checkout</dt>
        <dd>{s(o, "external_order_id", "—")}</dd>
        <dt>Checkout</dt>
        <dd>{s(o, "provider")}</dd>
        <dt>Valor</dt>
        <dd className="tf-money">
          {s(o, "currency")}{" "}
          {n(o, "gross_amount").toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}
        </dd>
        <dt>Pagamento</dt>
        <dd>{s(o, "payment_method", "—")}</dd>
        <dt>Origem</dt>
        <dd>{s(o, "utm_source", "Não identificada")}</dd>
        <dt>Campanha</dt>
        <dd>{s(o, "utm_campaign", "Não identificada")}</dd>
        <dt>Tipo da oferta</dt>
        <dd>
          {classifications[s(object(o.tracking_data), "offer_type")] ||
            "Não informado pelo checkout"}
        </dd>
      </dl>
      <p>
        {tracking === "untracked"
          ? "O pedido chegou sem vínculo com uma visita. Isso não comprova origem orgânica."
          : tracking === "pending"
            ? "Recebemos o código, mas a visita correspondente ainda não foi encontrada."
            : "A visita está identificada. Campanha e anúncio dependem dos identificadores recebidos."}
      </p>
      {error && (
        <p className="tf-error" role="alert">
          {error}
        </p>
      )}
      {detail ? (
        <>
          <h3>Produtos do pedido</h3>
          <SimpleTable
            headers={["Produto", "Quantidade", "Valor do item"]}
            rows={detail.items.map((i) => [
              s(i, "product_name", s(i, "external_product_id")),
              n(i, "quantity"),
              i.total_amount == null
                ? "Não informado"
                : s(o, "currency") +
                  " " +
                  n(i, "total_amount").toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  }),
            ])}
          />
          <p className="tf-note">
            Valores dos itens não são somados novamente ao faturamento do
            pedido.
          </p>
          <h3>Histórico do pagamento</h3>
          <SimpleTable
            headers={["Data", "Evento", "Situação"]}
            rows={detail.events.map((e) => [
              s(e, "event_at")
                ? new Date(s(e, "event_at")).toLocaleString("pt-BR", {
                    timeZone: timezone,
                  })
                : "—",
              s(e, "event_type"),
              s(e, "normalized_status"),
            ])}
          />
          <details>
            <summary>Diagnóstico da origem</summary>
            <dl className="tf-details">
              {[
                "utm_source",
                "utm_medium",
                "utm_campaign",
                "utm_content",
                "utm_term",
                "tracking_session_id",
                "attribution_method",
              ].map((k) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{s(o, k, "—")}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      ) : (
        <Empty>Carregando detalhes do pedido…</Empty>
      )}
    </>
  );
}
