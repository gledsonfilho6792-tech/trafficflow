"use client";
import Link from "next/link";
import { OfferComparison } from "./comparison";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Plus, Trophy, ArrowUpRight, RefreshCw } from "lucide-react";
import { deferEffect } from "@/lib/defer-effect";
import { Section, Field, Empty } from "./primitives";
import { brl, percent } from "./visuals";
import { dateInZone } from "@/lib/workspace/analytics";
type Offer = {
  id: string;
  name: string;
  investment: number;
  revenue: number;
  costs: number;
  profit: number;
  roi: number | null;
  roas: number | null;
  margin: number | null;
  sales: number;
};
export default function Portfolio() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [positive, setPositive] = useState("all"),
    [sort, setSort] = useState("profit"),
    [name, setName] = useState(""),
    [creating, setCreating] = useState(false),
    [start, setStart] = useState(() =>
      dateInZone(
        new Date(Date.now() - 6 * 86400000).toISOString(),
        "America/Fortaleza",
      ),
    ),
    [end, setEnd] = useState(() =>
      dateInZone(new Date().toISOString(), "America/Fortaleza"),
    );
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await fetch(
          "/api/portfolio?" + new URLSearchParams({ start, end }),
          { signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setOffers(result.projects);
        setError("");
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [start, end],
  );
  useEffect(() => {
    const c = new AbortController();
    const stop = deferEffect(() => void load(c.signal));
    return () => {
      stop();
      c.abort();
    };
  }, [load]);
  const sorted = offers
    .filter(
      (o) =>
        o.name.toLowerCase().includes(search.toLowerCase()) &&
        (positive === "all" ||
          (positive === "positive" ? o.profit >= 0 : o.profit < 0)),
    )
    .sort((a, b) =>
      sort === "revenue" ? b.revenue - a.revenue : b.profit - a.profit,
    );
  return (
    <div className="tf-shell">
      <header className="tf-portfolio-header">
        <Link href="/projects" className="tf-brand">
          <span>
            <BarChart3 />
          </span>
          Traffic<span className="tf-brand-accent">Flow</span>
        </Link>
        <span>Visão da operação · uma dashboard por oferta</span>
      </header>
      <main className="tf-main tf-portfolio-main">
        <div className="tf-heading">
          <div>
            <small className="tf-eyebrow">GESTÃO DE OFERTAS</small>
            <h1>Sua operação em uma visão.</h1>
            <p>
              Compare resultados e abra a dashboard de cada oferta para
              gerenciar o tráfego.
            </p>
          </div>
          <div className="tf-period">
            <Field label="De">
              <input
                type="date"
                value={start}
                max={end}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label="Até">
              <input
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
            <button
              onClick={() => void load()}
              disabled={loading}
              aria-label="Atualizar ofertas"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>
        {error && (
          <p className="tf-error" role="alert">
            {error}
          </p>
        )}
        <div className="tf-kpis tf-kpis-3">
          {[
            ["Ofertas positivas", offers.filter((o) => o.profit >= 0).length],
            ["Ofertas negativas", offers.filter((o) => o.profit < 0).length],
            ["Faturamento", brl(offers.reduce((v, o) => v + o.revenue, 0))],
          ].map(([label, value]) => (
            <div className="tf-metric" key={label}>
              <span>{label}</span>
              <strong className="tf-money">{value}</strong>
            </div>
          ))}
        </div>
        <Section
          title="Suas ofertas"
          description="Cada oferta tem campanhas, contas, integrações e pedidos próprios"
        >
          <div className="tf-manager-filters">
            <Field label="Buscar oferta">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome da oferta"
              />
            </Field>
            <Field label="Resultado">
              <select
                value={positive}
                onChange={(e) => setPositive(e.target.value)}
              >
                <option value="all">Todas</option>
                <option value="positive">Positivas</option>
                <option value="negative">Negativas</option>
              </select>
            </Field>
            <Field label="Ordenar">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="profit">Maior Lucro</option>
                <option value="revenue">Maior Faturamento</option>
              </select>
            </Field>
          </div>
          {loading && <p className="tf-note">Atualizando resultados…</p>}
          <div className="tf-offer-grid">
            {sorted.map((o, i) => (
              <article className="tf-offer-card" key={o.id}>
                <div className="tf-offer-head">
                  <span>
                    <Trophy size={20} />
                  </span>
                  <div>
                    <small>{i === 0 ? "DESTAQUE DO RECORTE" : "OFERTA"}</small>
                    <h3>{o.name}</h3>
                  </div>
                  <Link
                    href={`/project/${o.id}/dashboard`}
                    aria-label={"Abrir " + o.name}
                  >
                    <ArrowUpRight size={19} />
                  </Link>
                </div>
                <div className="tf-offer-profit">
                  <small>LUCRO</small>
                  <strong
                    className={
                      "tf-money " + (o.profit < 0 ? "tf-negative" : "")
                    }
                  >
                    {brl(o.profit)}
                  </strong>
                </div>
                <div className="tf-offer-metrics">
                  {[
                    ["FATURAMENTO", brl(o.revenue)],
                    ["INVESTIMENTO", brl(o.investment)],
                    ["ROAS", o.roas === null ? "—" : o.roas.toFixed(2) + "×"],
                    ["MARGEM", percent(o.margin)],
                    ["VENDAS", o.sales],
                    ["ROI", percent(o.roi)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <small>{label}</small>
                      <strong className="tf-money">{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="tf-actions">
                  <Link
                    className="tf-button tf-primary"
                    href={`/project/${o.id}/dashboard`}
                  >
                    Abrir dashboard
                  </Link>
                  <Link
                    className="tf-button"
                    href={`/project/${o.id}/campaigns`}
                  >
                    Tráfego ↗
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!sorted.length && !loading && (
            <Empty>Nenhuma oferta neste filtro.</Empty>
          )}
        </Section>
        <OfferComparison offers={offers} start={start} end={end} />
        <Section
          title="Criar dashboard de uma oferta"
          description="A nova dashboard começa sem campanhas vinculadas"
        >
          <form
            className="tf-create-offer"
            onSubmit={async (e) => {
              e.preventDefault();
              setCreating(true);
              try {
                const response = await fetch("/api/portfolio", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                router.push("/project/" + result.project.id + "/settings");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Falha ao criar.");
              } finally {
                setCreating(false);
              }
            }}
          >
            <Field label="Nome da oferta">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={160}
                placeholder="Ex.: Receitas para cães · Oferta principal"
              />
            </Field>
            <button className="tf-primary" disabled={creating}>
              <Plus size={15} /> Criar dashboard
            </button>
          </form>
        </Section>
      </main>
    </div>
  );
}
