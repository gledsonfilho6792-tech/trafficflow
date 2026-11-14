"use client";
import { useEffect, useState } from "react";
import { Section, Field } from "./primitives";
import { brl, percent } from "./visuals";
import { validDate, dateInZone } from "@/lib/workspace/analytics";
type Offer = {
  id: string;
  name: string;
  profit: number;
  revenue: number;
  investment: number;
  costs: number;
  sales: number;
  roi: number | null;
};
export function OfferComparison({
  offers,
  start,
  end,
}: {
  offers: Offer[];
  start: string;
  end: string;
}) {
  const [mode, setMode] = useState("offers"),
    [a, setA] = useState(""),
    [b, setB] = useState(""),
    [previous, setPrevious] = useState<Offer[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const safeStart = validDate(start)
      ? start
      : dateInZone(new Date().toISOString(), "America/Fortaleza"),
    safeEnd = validDate(end) && end >= safeStart ? end : safeStart;
  const days = Math.min(
    367,
    (Date.parse(safeEnd) - Date.parse(safeStart)) / 86400000 + 1,
  );
  const previousEnd = new Date(Date.parse(safeStart + "T12:00:00Z") - 86400000)
      .toISOString()
      .slice(0, 10),
    previousStart = new Date(
      Date.parse(safeStart + "T12:00:00Z") - days * 86400000,
    )
      .toISOString()
      .slice(0, 10);
  useEffect(() => {
    if (mode !== "periods") return;
    let active = true;
    const c = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(
        "/api/portfolio?" +
          new URLSearchParams({ start: previousStart, end: previousEnd }),
        { signal: c.signal },
      )
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          if (active) {
            setPrevious(d.projects);
            setError("");
          }
        })
        .catch((e) => {
          if (active && e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
      c.abort();
    };
  }, [mode, previousStart, previousEnd]);
  const sideA = offers.find((o) => o.id === a) || offers[0],
    sideB =
      mode === "offers"
        ? offers.find((o) => o.id === b) || offers[1]
        : previous.find((o) => o.id === sideA?.id);
  if (!sideA) return null;
  return (
    <Section
      title="Comparação de resultados"
      description="Duas ofertas ou a mesma oferta em dois períodos"
    >
      <div className="tf-tabs">
        <button
          aria-pressed={mode === "offers"}
          onClick={() => setMode("offers")}
        >
          Oferta × Oferta
        </button>
        <button
          aria-pressed={mode === "periods"}
          onClick={() => setMode("periods")}
        >
          Período × Período
        </button>
      </div>
      <div className="tf-grid-2">
        <Field label="Oferta A">
          <select value={sideA.id} onChange={(e) => setA(e.target.value)}>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        {mode === "offers" ? (
          <Field label="Oferta B">
            <select
              value={sideB?.id || ""}
              onChange={(e) => setB(e.target.value)}
            >
              <option value="" disabled>
                Selecione outra oferta
              </option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p>
            Período anterior de igual duração:{" "}
            <strong>
              {previousStart.split("-").reverse().join("/")} a{" "}
              {previousEnd.split("-").reverse().join("/")}
            </strong>
            .
          </p>
        )}
      </div>
      {error && <p className="tf-error">{error}</p>}
      {loading ? (
        <p>Carregando comparação…</p>
      ) : sideB ? (
        <>
          <div className="tf-grid-2">
            {[sideA, sideB].map((o, i) => (
              <article key={i} className="tf-compare-card">
                <small>
                  {i === 0
                    ? "A · Período selecionado"
                    : mode === "periods"
                      ? "B · Período anterior"
                      : "B · Período selecionado"}
                </small>
                <h3>{o.name}</h3>
                <strong className="tf-big-number tf-money">
                  {brl(o.profit)}
                </strong>
                <p>
                  Lucro · {o.sales} vendas · ROI {percent(o.roi)}
                </p>
                <p>
                  Faturamento <span className="tf-money">{brl(o.revenue)}</span>{" "}
                  · Investimento{" "}
                  <span className="tf-money">{brl(o.investment)}</span>
                </p>
              </article>
            ))}
          </div>
          <div className="tf-report-total">
            <span>
              {sideA.profit === sideB.profit
                ? "Empate no lucro"
                : (sideA.profit > sideB.profit ? "Lado A" : "Lado B") +
                  " tem maior lucro"}
            </span>
            <strong className="tf-money">
              Diferença A − B: {brl(sideA.profit - sideB.profit)}
            </strong>
          </div>
          <p className="tf-note">
            Diferença de Faturamento {brl(sideA.revenue - sideB.revenue)} −
            Investimento {brl(sideA.investment - sideB.investment)} − Custos{" "}
            {brl(sideA.costs - sideB.costs)} = Diferença de Lucro.
          </p>
        </>
      ) : (
        <p>Selecione duas ofertas ou use a comparação de períodos.</p>
      )}
    </Section>
  );
}
