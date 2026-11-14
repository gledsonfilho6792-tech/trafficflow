"use client";
import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  aggregate,
  dateInZone,
  scopeCampaigns,
} from "@/lib/workspace/analytics";
import {
  numeric as n,
  text as s,
  type Row,
  type WorkspaceData,
} from "@/lib/workspace/types";
export const brl = (v: number | null) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);
export const percent = (v: number | null) =>
  v === null
    ? "—"
    : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
export function Evolution({ data }: { data: WorkspaceData }) {
  const summary = aggregate(data),
    ids = new Set(scopeCampaigns(data).map((r) => r.id)),
    days = new Map<
      string,
      { date: string; Faturamento: number; Investimento: number; Lucro: number }
    >();
  for (
    let day = Date.parse(data.period.start + "T12:00:00Z");
    day <= Date.parse(data.period.end + "T12:00:00Z");
    day += 86400000
  ) {
    const d = new Date(day).toISOString().slice(0, 10);
    days.set(d, { date: d, Faturamento: 0, Investimento: 0, Lucro: 0 });
  }
  for (const insight of data.insights)
    if (insight.level === "campaign" && ids.has(s(insight, "campaign_id"))) {
      const day = days.get(s(insight, "metric_date"));
      if (day) day.Investimento += n(insight, "spend_brl");
    }
  for (const o of summary.paid)
    if (o.currency === "BRL") {
      const day = days.get(dateInZone(s(o, "paid_at"), data.project.timezone));
      if (day) day.Faturamento += n(o, "gross_amount");
    }
  for (const day of days.values()) {
    const cost = data.expenses
      .filter((e) => e.occurred_on === day.date)
      .reduce((v, e) => v + n(e, "amount_brl"), 0);
    day.Lucro = day.Faturamento - day.Investimento - cost;
  }
  return (
    <div className="tf-chart">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={[...days.values()]}
          margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="tf-chart-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6dc8db" stopOpacity={0.22} />
              <stop offset="1" stopColor="#6dc8db" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--tf-line)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(v) =>
              String(v).slice(5).split("-").reverse().join("/")
            }
            tick={{ fill: "var(--tf-muted)", fontSize: 10 }}
          />
          <YAxis
            tickFormatter={(v) =>
              Number(v).toLocaleString("pt-BR", { notation: "compact" })
            }
            tick={{ fill: "var(--tf-muted)", fontSize: 10 }}
            width={55}
          />
          <Tooltip
            contentStyle={{
              background: "var(--tf-card)",
              border: "1px solid var(--tf-line)",
              borderRadius: 10,
              color: "var(--tf-text)",
            }}
            formatter={(v) => brl(Number(v))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            name="Faturamento"
            dataKey="Faturamento"
            type="monotone"
            stroke="#69cde4"
            fill="url(#tf-chart-gradient)"
            strokeWidth={2}
          />
          <Area
            name="Investimento"
            dataKey="Investimento"
            type="monotone"
            stroke="#d9b36b"
            fill="transparent"
            strokeWidth={2}
          />
          <Area
            name="Lucro"
            dataKey="Lucro"
            type="monotone"
            stroke="#64d6a6"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ConversionFunnel({
  data,
  onStep,
}: {
  data: WorkspaceData;
  onStep: (label: string, detail: string) => void;
}) {
  const summary = aggregate(data),
    selected = new Set(scopeCampaigns(data).map((r) => r.id)),
    clicks = data.insights
      .filter(
        (i) => i.level === "campaign" && selected.has(s(i, "campaign_id")),
      )
      .reduce((v, i) => v + n(i, "clicks"), 0);
  const events = data.events.filter((e) => {
    const d = dateInZone(s(e, "occurred_at"), data.project.timezone);
    return d >= data.period.start && d <= data.period.end;
  });
  const pv = events.filter((e) => e.event_name === "page_view").length,
    ic = events.filter((e) => e.event_name === "checkout_started").length;
  const orders = data.orders.filter((o) => {
    const d = dateInZone(
      s(o, "provider_created_at", s(o, "created_at")),
      data.project.timezone,
    );
    return d >= data.period.start && d <= data.period.end;
  });
  const linkClicks = events.filter(
    (e) => e.event_name === "initiate_checkout",
  ).length;
  const values = [clicks, pv, ic || null, orders.length, summary.sales];
  const labels = [
    "Cliques",
    "Page View",
    "IC",
    "Vendas Iniciadas",
    "Vendas Aprovadas",
  ];
  const descriptions = [
    "Cliques recebidos da mídia, nas campanhas vinculadas à dashboard.",
    "Eventos de visualização de página registrados pelo script. Não representam visitantes únicos.",
    `Início observado no checkout. A instrumentação atual registrou ${linkClicks} cliques de saída para o checkout; esses cliques não comprovam abertura e não substituem IC.`,
    "Pedidos criados no período; incluem pagamentos ainda pendentes.",
    "Pedidos pagos no período, pela data de aprovação.",
  ];
  const max = Math.max(1, ...values.filter((v): v is number => v !== null));
  const heights = values.map((v) =>
    v === null ? null : Math.max(v > 0 ? 2 : 0, (v / max) * 65),
  );
  return (
    <>
      <div className="tf-funnel-scroll">
        <svg
          className="tf-funnel"
          viewBox="0 0 1100 230"
          role="group"
          aria-label="Funil de conversão"
        >
          <defs>
            <linearGradient
              id="tf-funnel-fill"
              x1="0"
              x2="1100"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#4f93b7" />
              <stop offset="1" stopColor="#7de7b4" />
            </linearGradient>
          </defs>
          {values.map((value, i) => {
            const x = i * 220,
              h = heights[i] ?? 25,
              next = heights[Math.min(i + 1, 4)] ?? h;
            return (
              <g
                key={labels[i]}
                role="button"
                tabIndex={0}
                aria-label={"Detalhar " + labels[i]}
                onClick={() => onStep(labels[i], descriptions[i])}
                onKeyDown={(e) => {
                  if (["Enter", " "].includes(e.key)) {
                    e.preventDefault();
                    onStep(labels[i], descriptions[i]);
                  }
                }}
              >
                <rect x={x} y={0} width={220} height={225} fill="transparent" />
                <text x={x + 110} y={22} textAnchor="middle">
                  {labels[i]}
                </text>
                <path
                  d={`M${x} ${113 - h}C${x + 150} ${113 - h} ${x + 75} ${113 - next} ${x + 220} ${113 - next}V${113 + next}C${x + 75} ${113 + next} ${x + 150} ${113 + h} ${x} ${113 + h}Z`}
                  fill={
                    value === null ? "var(--tf-line)" : "url(#tf-funnel-fill)"
                  }
                  opacity={value === null ? 0.5 : 1}
                />
                <text
                  className="tf-funnel-value"
                  x={x + 110}
                  y={i < 2 ? 117 : 66}
                  textAnchor="middle"
                >
                  {value === null
                    ? "—"
                    : clicks > 0
                      ? percent((value / clicks) * 100)
                      : "—"}
                </text>
                <text
                  className="tf-funnel-value"
                  x={x + 110}
                  y={204}
                  textAnchor="middle"
                >
                  {value === null
                    ? "Não monitorada"
                    : value.toLocaleString("pt-BR")}
                </text>
                {i > 0 && (
                  <path
                    d={`M${x} 35V181`}
                    stroke="var(--tf-line)"
                    strokeDasharray="3 5"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="tf-note">
        Volumes do período · percentuais sobre Cliques · fontes e datas podem
        ter coberturas diferentes. Clique na etapa para conferir a medição.
      </p>
    </>
  );
}
type Shape = { code?: string; name: string; d: string };
const normalized = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const countryNames = new Map<string, string>();
const countryDisplay = new Map<string, string>();
const enRegions = new Intl.DisplayNames(["en"], { type: "region" }),
  ptRegions = new Intl.DisplayNames(["pt-BR"], { type: "region" });
for (let a = 65; a <= 90; a++)
  for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b),
      en = enRegions.of(code),
      pt = ptRegions.of(code);
    if (en && en !== code) {
      const canonical = normalized(en);
      for (const alias of [code, en, pt || en])
        countryNames.set(normalized(alias), canonical);
      countryDisplay.set(canonical, pt || en);
    }
  }
const naturalAliases: Record<string, string> = {
  "united states of america": "united states",
  "united republic of tanzania": "tanzania",
  "democratic republic of the congo": "congo - kinshasa",
  "republic of the congo": "congo - brazzaville",
  "ivory coast": "cote d’ivoire",
  "south korea": "south korea",
  "north korea": "north korea",
};
const canonicalCountry = (v: string) => {
  const key = normalized(v),
    alias = naturalAliases[key] || key;
  return countryNames.get(alias) || alias;
};
export function SalesMap({
  data,
  onRegion,
}: {
  data: WorkspaceData;
  onRegion: (label: string, orders: Row[]) => void;
}) {
  const [mode, setMode] = useState("brazil"),
    [metric, setMetric] = useState("sales"),
    [shapes, setShapes] = useState<Shape[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/maps/" + mode + ".json")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((value) => {
        if (active) setShapes(value);
      })
      .catch((e) => {
        if (active && e.name !== "AbortError")
          setError("Não foi possível carregar o mapa.");
      });
    return () => {
      active = false;
    };
  }, [mode]);
  const paid = aggregate(data).paid;
  const isBr = (o: Row) =>
    ["br", "bra", "brasil", "brazil"].includes(
      normalized(s(o, "customer_country")),
    );
  const byShape = (shape: Shape) =>
    paid.filter((o) =>
      mode === "brazil"
        ? isBr(o) &&
          [normalized(shape.code || ""), normalized(shape.name)].includes(
            normalized(s(o, "customer_state")),
          )
        : canonicalCountry(s(o, "customer_country")) ===
            canonicalCountry(shape.name) ||
          (shape.name === "Brazil" && isBr(o)),
    );
  const matches = shapes.map((shape) => {
    const orders = byShape(shape);
    const revenue = orders
      .filter((o) => o.currency === "BRL")
      .reduce((v, o) => v + n(o, "gross_amount"), 0);
    return {
      shape,
      orders,
      revenue,
      value: metric === "sales" ? orders.length : revenue,
      label:
        mode === "world"
          ? countryDisplay.get(canonicalCountry(shape.name)) || shape.name
          : shape.name,
    };
  });
  const covered = new Set(matches.flatMap((m) => m.orders.map((o) => o.id)))
      .size,
    max = Math.max(1, ...matches.map((m) => m.value));
  return (
    <>
      <div className="tf-section-actions">
        <div className="tf-tabs">
          <button
            aria-pressed={mode === "brazil"}
            onClick={() => {
              setShapes([]);
              setError("");
              setMode("brazil");
            }}
          >
            Brasil
          </button>
          <button
            aria-pressed={mode === "world"}
            onClick={() => {
              setShapes([]);
              setError("");
              setMode("world");
            }}
          >
            Mundo
          </button>
        </div>
        <select
          aria-label="Métrica do mapa"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
        >
          <option value="sales">Vendas</option>
          <option value="revenue">Faturamento (BRL)</option>
        </select>
        <span className="tf-note">
          {covered}/{paid.length} vendas localizadas neste mapa
        </span>
      </div>
      {error && (
        <p role="alert" className="tf-error">
          {error}
        </p>
      )}
      <div className="tf-map-layout">
        <svg
          viewBox={mode === "brazil" ? "0 0 485 490" : "0 0 540 230"}
          role="group"
          aria-label="Distribuição geográfica das vendas"
        >
          {matches.map(({ shape, orders, value, label, revenue }) => (
            <path
              key={shape.code || shape.name}
              d={shape.d}
              fill={
                orders.length
                  ? `hsl(155 ${24 + (value / max) * 24}% ${26 + (value / max) * 29}%)`
                  : "var(--tf-map-empty)"
              }
              role="button"
              tabIndex={0}
              aria-label={`${label}: ${orders.length} vendas, ${brl(revenue)}`}
              onClick={() => onRegion(label, orders)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRegion(label, orders);
                }
              }}
            >
              <title>
                {label}: {orders.length} vendas aprovadas · {brl(revenue)}
              </title>
            </path>
          ))}
        </svg>
        <div>
          {matches
            .filter((m) => m.orders.length)
            .sort((a, b) => b.value - a.value)
            .map((m) => (
              <button
                className="tf-region"
                key={m.shape.name}
                onClick={() => onRegion(m.label, m.orders)}
              >
                <span>
                  {m.label}
                  <small>
                    {m.orders.length} vendas ·{" "}
                    <span className="tf-money">{brl(m.revenue)}</span>
                  </small>
                </span>
                <i style={{ width: (100 * m.value) / max + "%" }} />
              </button>
            ))}
          {!covered && (
            <p className="tf-empty">
              Nenhuma venda com localização compatível neste período.
            </p>
          )}
          <p className="tf-note">
            Sem localização compatível neste recorte: {paid.length - covered}.
            Dados do comprador enviados pelo checkout; sem endereço ou ponto
            individual.
          </p>
        </div>
      </div>
    </>
  );
}
