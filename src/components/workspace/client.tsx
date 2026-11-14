"use client";
import { OrderDetails } from "./order-details";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  RefreshCw,
  ArrowUpRight,
  SlidersHorizontal,
  Plus,
  X,
  Wallet,
  ChartNoAxesCombined,
  ShoppingBag,
  Target,
  Percent,
  FileChartColumn,
} from "lucide-react";
import {
  aggregate,
  attribution,
  dateInZone,
  scopeCampaigns,
} from "@/lib/workspace/analytics";
import {
  numeric as n,
  text as s,
  object,
  strings,
  type Row,
  type WorkspaceData,
} from "@/lib/workspace/types";
import { deferEffect } from "@/lib/defer-effect";
import { Evolution, ConversionFunnel, SalesMap, brl, percent } from "./visuals";
import { IntegrationWorkspace } from "./integrations";
import { NotificationSettings } from "./notifications";
export type WorkspaceMode =
  | "dashboard"
  | "campaigns"
  | "sales"
  | "finance"
  | "integrations"
  | "tracking"
  | "reports"
  | "rules"
  | "events"
  | "notifications"
  | "utms"
  | "live"
  | "settings";
const titles: Record<WorkspaceMode, string> = {
  dashboard: "Resumo da operação",
  campaigns: "Gestão de Tráfego",
  sales: "Vendas",
  finance: "Gestão Financeira",
  integrations: "Integrações",
  tracking: "Tracking Avançado",
  reports: "Relatórios",
  rules: "Regras",
  events: "Eventos",
  notifications: "Notificações",
  utms: "UTMs",
  live: "Ao Vivo",
  settings: "Configurações da oferta",
};
import {
  Section,
  Empty,
  Field,
  Badge,
  SimpleTable,
  type Mutate,
} from "./primitives";
const formatDate = (v: string, timezone = "America/Fortaleza") =>
  v ? new Date(v).toLocaleString("pt-BR", { timeZone: timezone }) : "—";
const trackingLabel = (o: Row) =>
  attribution(o) === "tracked"
    ? "Rastreada"
    : attribution(o) === "pending"
      ? "Origem a confirmar"
      : "Não rastreada";
function PaymentBadge({ order }: { order: Row }) {
  return (
    <Badge
      tone={
        order.status === "paid"
          ? "green"
          : order.status === "pending"
            ? "amber"
            : "default"
      }
    >
      {(
        {
          paid: "Aprovada",
          pending: "Pendente",
          refunded: "Reembolsada",
          chargeback: "Chargeback",
          canceled: "Cancelada",
          disputed: "Em disputa",
        } as Record<string, string>
      )[s(order, "status")] || s(order, "status")}
    </Badge>
  );
}
const baseColumns = ["investment", "revenue", "sales", "roas", "cpa", "clicks"];
const columnNames: Record<string, string> = {
  investment: "Investimento",
  revenue: "Faturamento atribuído",
  profit: "Lucro",
  roi: "ROI",
  margin: "Margem",
  sales: "Vendas",
  started: "Vendas Iniciadas",
  pending_sales: "Vendas Pendentes",
  refunded: "Reembolsos",
  chargebacks: "Chargebacks",
  roas: "ROAS",
  cpa: "CPA",
  clicks: "Cliques",
  impressions: "Impressões",
  ctr: "CTR",
  cpc: "CPC",
  cpm: "CPM",
  pageviews: "Page View",
  cpv: "CPV",
  ic: "IC",
  cpi: "CPI",
  checkout_clicks: "Cliques para checkout",
  connection: "Taxa de conexão",
  conversion: "Conversão da página",
  checkout_conversion: "Conversão do checkout",
  icr: "Taxa de IC",
  arpu: "ARPU",
  external_id: "ID",
  updated_at: "Atualização",
  status: "Veiculação",
  account: "Conta de anúncio",
};
const pretty = (r: Record<string, unknown>, key: string) => {
  if (r[key] === null || r[key] === undefined) return "—";
  if (
    [
      "investment",
      "revenue",
      "profit",
      "cpa",
      "cpc",
      "cpm",
      "cpv",
      "cpi",
      "arpu",
    ].includes(key)
  )
    return brl(Number(r[key]));
  if (
    [
      "ctr",
      "roi",
      "margin",
      "connection",
      "conversion",
      "checkout_conversion",
      "icr",
    ].includes(key)
  )
    return percent(Number(r[key]));
  if (key === "roas") return Number(r[key]).toFixed(2) + "×";
  if (key === "updated_at") return formatDate(s(r, key));
  return String(r[key]);
};
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="tf-dialog"
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) {
          const b = ref.current.getBoundingClientRect();
          if (
            e.clientX < b.left ||
            e.clientX > b.right ||
            e.clientY < b.top ||
            e.clientY > b.bottom
          )
            close();
        }
      }}
    >
      <div className="tf-dialog-heading">
        <div>
          <small>TRAFFIC FLOW</small>
          <h2>{title}</h2>
        </div>
        <button onClick={close} aria-label="Fechar">
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function WorkspaceClient({
  projectId,
  timezone,
  mode,
}: {
  projectId: string;
  timezone: string;
  mode: WorkspaceMode;
}) {
  const [end, setEnd] = useState(() =>
      dateInZone(new Date().toISOString(), timezone),
    ),
    [start, setStart] = useState(() =>
      dateInZone(new Date(Date.now() - 6 * 86400000).toISOString(), timezone),
    );
  const [data, setData] = useState<WorkspaceData | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [tab, setTab] = useState(mode === "finance" ? "Resultado" : "Campanhas"),
    [account, setAccount] = useState("all"),
    [status, setStatus] = useState("all"),
    [search, setSearch] = useState(""),
    [tracking, setTracking] = useState("all"),
    [parent, setParent] = useState(""),
    [columns, setColumns] = useState(baseColumns),
    [group, setGroup] = useState("Dia");
  const [modal, setModal] = useState<{ title: string; body: ReactNode } | null>(
    null,
  );
  const requestRef = useRef<AbortController | null>(null),
    initialColumns = useRef(false);
  const refresh = useCallback(
    async (silent = false) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      if (!silent) setLoading(true);
      setError("");
      try {
        const response = await fetch(
          "/api/workspace?" + new URLSearchParams({ projectId, start, end }),
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Falha ao carregar.");
        setData(result.data);
        if (!initialColumns.current) {
          const c = strings(object(result.data.preferences.columns)[mode]);
          if (c.length) setColumns(c.filter((v) => v in columnNames));
          initialColumns.current = true;
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [projectId, start, end, mode],
  );
  useEffect(() => {
    const cancel = deferEffect(() => void refresh());
    return () => {
      cancel();
      requestRef.current?.abort();
    };
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(
      () => {
        if (document.visibilityState === "visible") void refresh(true);
      },
      mode === "live" ? 15000 : 60000,
    );
    return () => clearInterval(timer);
  }, [refresh, mode]);
  const mutate: Mutate = async (action, input) => {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/workspace/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action, input }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível salvar.");
      setNotice("Salvo e sincronizado com o banco.");
      await refresh(true);
      return result.result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
      throw e;
    } finally {
      setSaving(false);
    }
  };
  const summary = useMemo(() => (data ? aggregate(data) : null), [data]);
  const manager = useMemo(
    () =>
      data
        ? aggregate(
            data,
            account,
            tab === "Conjuntos"
              ? "adset"
              : tab === "Anúncios"
                ? "ad"
                : "campaign",
            parent,
          )
        : null,
    [data, account, tab, parent],
  );
  const openInfo = (title: string, body: ReactNode) =>
    setModal({ title, body });
  function openForm(
    title: string,
    body: ReactNode,
    submit: (form: FormData) => Promise<void>,
  ) {
    openInfo(
      title,
      <form
        className="tf-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const button = e.currentTarget.querySelector(
            "button[type=submit]",
          ) as HTMLButtonElement | null;
          if (button) button.disabled = true;
          try {
            await submit(new FormData(e.currentTarget));
            setModal(null);
          } catch {
          } finally {
            if (button) button.disabled = false;
          }
        }}
      >
        {body}
        <p className="tf-note">A alteração será salva na dashboard atual.</p>
        <button className="tf-primary" type="submit">
          Salvar
        </button>
      </form>,
    );
  }
  function openMetric(key: string, title: string, value: string) {
    const help: Record<string, string> = {
      investment:
        "Investimento convertido em BRL das campanhas selecionadas. Cada nível da Meta é contado separadamente, sem somar campanha + conjunto + anúncio.",
      revenue:
        "Faturamento de pedidos atualmente pagos, pela data de aprovação. Valores em outras moedas sem conversão verificável ficam fora do total em BRL.",
      profit:
        "Faturamento − Investimento − Taxas e outros custos informados. O detalhe dos custos fica no Financeiro.",
      roi: "Lucro ÷ (Investimento + Taxas e outros custos) × 100. Sem custos no denominador, ROI não é calculável.",
      roas: "Faturamento atribuído às campanhas selecionadas ÷ Investimento. Vendas sem origem não são atribuídas à mídia.",
      margin: "Lucro ÷ Faturamento × 100.",
    };
    openInfo(
      title,
      <>
        <div className="tf-modal-value tf-money">{value}</div>
        <p>{help[key]}</p>
        <Link className="tf-button" href={`/project/${projectId}/finance`}>
          Conferir custos e resultado <ArrowUpRight size={15} />
        </Link>
      </>,
    );
  }
  function kpis() {
    if (!summary) return null;
    return (
      <div className="tf-kpis">
        {[
          [
            "investment",
            "Investimento",
            brl(summary.investment),
            ChartNoAxesCombined,
          ],
          ["revenue", "Faturamento", brl(summary.revenue), ShoppingBag],
          ["profit", "Lucro", brl(summary.profit), Wallet],
          ["roi", "ROI", percent(summary.roi), Percent],
          [
            "roas",
            "ROAS",
            summary.roas === null ? "—" : summary.roas.toFixed(2) + "×",
            Target,
          ],
          ["margin", "Margem", percent(summary.margin), FileChartColumn],
        ].map(([key, label, value, Icon]) => {
          const I = Icon as typeof Wallet;
          return (
            <button
              className={`tf-metric ${key === "roi" || key === "profit" ? "tf-positive" : ""}`}
              key={String(key)}
              onClick={() =>
                openMetric(String(key), String(label), String(value))
              }
            >
              <span>
                {String(label)}
                <I size={17} />
              </span>
              <strong className="tf-money">{String(value)}</strong>
              <small>
                Ver composição <ArrowUpRight size={11} />
              </small>
            </button>
          );
        })}
      </div>
    );
  }
  function addCash(commitment = false) {
    openForm(
      commitment ? "Novo compromisso" : "Novo lançamento",
      <>
        <Field label="Descrição">
          <input name="name" required maxLength={160} />
        </Field>
        <div className="tf-form-grid">
          <Field label="Tipo">
            <select name="direction">
              <option value="expense">Saída</option>
              <option value="income">Entrada</option>
            </select>
          </Field>
          <Field label="Valor (BRL)">
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </Field>
        </div>
        <Field label={commitment ? "Vencimento" : "Data da movimentação"}>
          <input type="date" name="date" defaultValue={end} required />
        </Field>
        <Field label="Categoria">
          <input name="category" defaultValue="Operação" maxLength={80} />
        </Field>
      </>,
      async (f) => {
        await mutate(commitment ? "commitment" : "cash", Object.fromEntries(f));
      },
    );
  }
  function addExpense() {
    openForm(
      "Nova despesa da operação",
      <>
        <Field label="Descrição">
          <input name="name" required />
        </Field>
        <Field label="Valor (BRL)">
          <input name="amount" type="number" min="0.01" step="0.01" required />
        </Field>
        <Field label="Data">
          <input type="date" name="date" defaultValue={end} required />
        </Field>
        <Field label="Categoria">
          <select name="category">
            <option value="tool">Ferramentas</option>
            <option value="tax">Impostos</option>
            <option value="operational">Operacional</option>
            <option value="other">Outros</option>
          </select>
        </Field>
      </>,
      async (f) => {
        const response = await fetch("/api/finance/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: f.get("name"),
            amount: Number(f.get("amount")),
            occurredOn: f.get("date"),
            category: f.get("category"),
          }),
        });
        const r = await response.json();
        if (!response.ok) {
          setError(r.error || "Falha ao salvar despesa.");
          throw new Error(r.error);
        }
        await refresh(true);
      },
    );
  }
  function orderDetail(order: Row) {
    openInfo(
      "Pedido · " + s(order, "id").slice(0, 8),
      <OrderDetails projectId={projectId} order={order} timezone={timezone} />,
    );
  }
  function salesList(orders: Row[], compact = false) {
    return compact ? (
      <div className="tf-sales-feed">
        {orders.slice(0, 6).map((o) => (
          <button key={o.id} onClick={() => orderDetail(o)}>
            <span className="tf-sale-icon">
              <ShoppingBag size={17} />
            </span>
            <span>
              <PaymentBadge order={o} />
              <small>
                {s(o, "provider")} ·{" "}
                {formatDate(s(o, "paid_at", s(o, "created_at")))}
              </small>
            </span>
            <strong className="tf-money">
              {s(o, "currency")} {n(o, "gross_amount").toLocaleString("pt-BR")}
            </strong>
          </button>
        ))}
        {!orders.length && <Empty>Nenhuma venda neste período.</Empty>}
      </div>
    ) : (
      <SimpleTable
        headers={[
          "Pedido",
          "Pagamento",
          "Rastreamento",
          "Checkout",
          "Valor",
          "Data",
          "",
        ]}
        rows={orders.map((o) => [
          s(o, "id").slice(0, 8),
          <PaymentBadge key="p" order={o} />,
          <Badge
            key="t"
            tone={attribution(o) === "untracked" ? "red" : "default"}
          >
            {trackingLabel(o)}
          </Badge>,
          s(o, "provider"),
          <span key="m" className="tf-money">
            {s(o, "currency")} {n(o, "gross_amount").toLocaleString("pt-BR")}
          </span>,
          formatDate(s(o, "provider_created_at", s(o, "created_at"))),
          <button key="d" onClick={() => orderDetail(o)}>
            Ver pedido ↗
          </button>,
        ])}
      />
    );
  }
  function columnChooser() {
    let draft = [...columns];
    openInfo(
      "Personalizar métricas",
      <ColumnChooser
        initial={draft}
        onSave={async (value) => {
          draft = value;
          await mutate("preferences", {
            columns: { ...object(data?.preferences.columns), [mode]: value },
          });
          setColumns(value);
          setModal(null);
        }}
      />,
    );
  }
  if (!data || !summary || !manager)
    return (
      <main className="tf-main">
        <h1>{titles[mode]}</h1>
        {error ? (
          <div className="tf-error" role="alert">
            {error}
            <button onClick={() => void refresh()}>Tentar novamente</button>
          </div>
        ) : (
          <div className="tf-loading">Carregando dados da dashboard…</div>
        )}
      </main>
    );
  const campaignOptions = scopeCampaigns(data),
    accountOptions = data.accounts.filter((a) =>
      campaignOptions.some((c) => c.ad_account_id === a.id),
    );
  const periodOrders = data.orders
    .filter((o) => {
      const d = dateInZone(
        o.status === "paid" && o.paid_at
          ? s(o, "paid_at")
          : s(o, "provider_created_at", s(o, "created_at")),
        timezone,
      );
      return d >= start && d <= end;
    })
    .sort((a, b) =>
      s(b, "provider_created_at", s(b, "created_at")).localeCompare(
        s(a, "provider_created_at", s(a, "created_at")),
      ),
    );
  const warnings = [
    ...data.warnings,
    ...(summary.foreignCurrency
      ? [
          `${summary.foreignCurrency} vendas em outra moeda não foram somadas ao Faturamento em BRL.`,
        ]
      : []),
    ...(data.insights.some(
      (i) =>
        i.spend_brl === null &&
        campaignOptions.some((c) => c.id === i.campaign_id),
    )
      ? [
          "Existem investimentos sem taxa de câmbio. Complete a conversão para fechar o resultado.",
        ]
      : []),
  ];
  let body: ReactNode;
  if (mode === "dashboard" || mode === "live")
    body = (
      <>
        {kpis()}
        <Section
          title="Evolução da operação"
          description="Faturamento, Investimento e Lucro por dia"
          actions={
            <Badge>
              Atualização a cada {mode === "live" ? "15" : "60"} segundos
            </Badge>
          }
        >
          <div className="tf-evolution-layout">
            <Evolution data={data} />
            {salesList(
              [...summary.paid].sort((a, b) =>
                s(b, "paid_at").localeCompare(s(a, "paid_at")),
              ),
              true,
            )}
          </div>
        </Section>
        <Section
          title="Funil de conversão"
          description="Da mídia à aprovação de pagamento"
        >
          <ConversionFunnel
            data={data}
            onStep={(t, d) => openInfo(t, <p>{d}</p>)}
          />
        </Section>
        <Section
          title="De onde vêm as vendas"
          description="Localização enviada pelo checkout"
        >
          <SalesMap
            data={data}
            onRegion={(label, orders) =>
              openInfo("Vendas · " + label, salesList(orders))
            }
          />
        </Section>
        <div className="tf-grid-2">
          <Section title="Cobertura do rastreamento">
            <div className="tf-coverage">
              <strong>
                {summary.sales
                  ? percent((summary.tracked / summary.sales) * 100)
                  : "—"}
              </strong>
              <span>
                Origem identificada em {summary.tracked} de {summary.sales}{" "}
                vendas
              </span>
            </div>
            <div className="tf-status-line">
              <Badge tone="amber">{summary.pending} a confirmar</Badge>
              <Badge tone="red">{summary.untracked} não rastreadas</Badge>
            </div>
          </Section>
          <Section title="Meta de faturamento">
            <strong className="tf-big-number tf-money">
              {brl(summary.revenue)}
            </strong>
            <p>
              de{" "}
              <span className="tf-money">{brl(n(data.settings, "goal"))}</span>
            </p>
            {n(data.settings, "goal") > 0 ? (
              <progress
                value={Math.max(0, summary.revenue)}
                max={n(data.settings, "goal")}
              />
            ) : (
              <p className="tf-note">
                Defina a meta para acompanhar seu progresso.
              </p>
            )}
            <Link href={`/project/${projectId}/settings`}>
              Configurar meta ↗
            </Link>
          </Section>
        </div>
      </>
    );
  else if (mode === "campaigns")
    body = (
      <>
        <div className="tf-tabs">
          {["Contas", "Campanhas", "Conjuntos", "Anúncios"].map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setParent("");
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <Section
          title={tab}
          description="Somente as campanhas vinculadas à oferta desta dashboard"
          actions={
            <div className="tf-actions">
              <button onClick={columnChooser}>
                <SlidersHorizontal size={15} /> Personalizar métricas
              </button>
              <Link
                className="tf-button"
                href={`/project/${projectId}/settings`}
              >
                Vincular campanhas
              </Link>
            </div>
          }
        >
          <div className="tf-manager-filters">
            <Field label="Buscar por nome">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Campanha, conjunto ou anúncio"
              />
            </Field>
            <Field label="Veiculação">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Todas</option>
                <option value="ACTIVE">Ativas</option>
                <option value="PAUSED">Pausadas</option>
              </select>
            </Field>
            <Field label="Conta de anúncio">
              <select
                value={account}
                onChange={(e) => {
                  setAccount(e.target.value);
                  setParent("");
                }}
              >
                <option value="all">Todas as contas desta oferta</option>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {s(a, "name")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {parent && (
            <button onClick={() => setParent("")}>
              Limpar seleção de campanha
            </button>
          )}
          {tab === "Contas" ? (
            <SimpleTable
              headers={["Conta", "Moeda", "Campanhas vinculadas"]}
              rows={accountOptions.map((a) => [
                s(a, "name"),
                s(a, "currency"),
                campaignOptions.filter((c) => c.ad_account_id === a.id).length,
              ])}
            />
          ) : (
            <SimpleTable
              headers={["Nome", ...columns.map((k) => columnNames[k] || k)]}
              rows={manager.rows
                .filter(
                  (r) =>
                    s(r, "name").toLowerCase().includes(search.toLowerCase()) &&
                    (status === "all" || s(r, "status") === status),
                )
                .map((r) => [
                  <button
                    key={r.id}
                    className="tf-text-button"
                    onClick={() => {
                      if (tab === "Anúncios")
                        openInfo(
                          s(r, "name"),
                          <dl className="tf-details">
                            <dt>ID</dt>
                            <dd>{s(r, "external_id")}</dd>
                            <dt>Status</dt>
                            <dd>{s(r, "status")}</dd>
                          </dl>,
                        );
                      else {
                        setParent(r.id);
                        setTab(tab === "Campanhas" ? "Conjuntos" : "Anúncios");
                      }
                    }}
                  >
                    {s(r, "name")} ↗
                  </button>,
                  ...columns.map((k) =>
                    pretty(
                      {
                        ...r,
                        account: s(
                          data.accounts.find(
                            (a) => a.id === s(r, "ad_account_id"),
                          ) || {},
                          "name",
                        ),
                      },
                      k,
                    ),
                  ),
                ])}
            />
          )}
          <p className="tf-note">
            {campaignOptions.length} campanhas vinculadas. As contas podem
            participar de mais de uma oferta; o vínculo de campanha define o
            recorte.
          </p>
        </Section>
      </>
    );
  else if (mode === "sales")
    body = (
      <>
        <div className="tf-kpis tf-kpis-3">
          {[
            ["Rastreadas", summary.tracked],
            ["Origem a confirmar", summary.pending],
            ["Não rastreadas", summary.untracked],
          ].map(([label, value]) => (
            <div className="tf-metric" key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <Section
          title="Pedidos da oferta"
          description="Pagamento e rastreamento são informações independentes"
          actions={
            <select
              aria-label="Filtrar rastreamento"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            >
              <option value="all">Todos os pedidos</option>
              <option value="tracked">Rastreadas</option>
              <option value="pending">Origem a confirmar</option>
              <option value="untracked">Não rastreadas</option>
            </select>
          }
        >
          {salesList(
            periodOrders.filter(
              (o) => tracking === "all" || attribution(o) === tracking,
            ),
          )}
        </Section>
      </>
    );
  else if (mode === "finance")
    body = (
      <>
        <div className="tf-tabs">
          {["Resultado", "Caixa", "Compromissos"].map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        {tab === "Resultado" ? (
          <>
            {kpis()}
            <Section
              title="Composição do lucro"
              actions={
                <button onClick={addExpense}>
                  <Plus size={15} /> Nova despesa
                </button>
              }
            >
              <SimpleTable
                headers={["Descrição", "Valor"]}
                rows={[
                  ["Faturamento", brl(summary.revenue)],
                  ["Investimento", brl(-summary.investment)],
                  ["Taxas e outros custos", brl(-summary.costs)],
                  ["Lucro", brl(summary.profit)],
                ]}
              />
              <p className="tf-note">
                Custos informados no Financeiro. Caixa registra recebimentos e
                pagamentos efetivos separadamente.
              </p>
            </Section>
            <Section title="Despesas e taxas registradas">
              <SimpleTable
                headers={["Data", "Descrição", "Origem", "Valor"]}
                rows={data.expenses.map((e) => [
                  s(e, "occurred_on"),
                  s(e, "name"),
                  s(e, "source"),
                  brl(n(e, "amount_brl")),
                ])}
              />
            </Section>
          </>
        ) : tab === "Caixa" ? (
          <>
            <div className="tf-kpis tf-kpis-3">
              {[
                [
                  "Entradas",
                  data.cash
                    .filter((c) => c.direction === "income")
                    .reduce((v, c) => v + n(c, "amount"), 0),
                ],
                [
                  "Saídas",
                  data.cash
                    .filter((c) => c.direction === "expense")
                    .reduce((v, c) => v + n(c, "amount"), 0),
                ],
                [
                  "Saldo do período",
                  data.cash.reduce(
                    (v, c) =>
                      v + n(c, "amount") * (c.direction === "income" ? 1 : -1),
                    0,
                  ),
                ],
              ].map(([k, v]) => (
                <div className="tf-metric" key={String(k)}>
                  <span>{k}</span>
                  <strong className="tf-money">{brl(Number(v))}</strong>
                </div>
              ))}
            </div>
            <Section
              title="Movimentação de caixa"
              description="Somente os lançamentos efetivos deste período; não representa saldo bancário"
              actions={
                <button className="tf-primary" onClick={() => addCash()}>
                  <Plus size={15} /> Novo lançamento
                </button>
              }
            >
              <SimpleTable
                headers={["Data", "Descrição", "Tipo", "Valor", ""]}
                rows={data.cash.map((c) => [
                  s(c, "occurred_on"),
                  s(c, "name"),
                  c.direction === "income" ? "Entrada" : "Saída",
                  brl(n(c, "amount")),
                  c.commitment_id ? (
                    "Baixa de compromisso"
                  ) : (
                    <button
                      key="r"
                      disabled={saving}
                      onClick={() =>
                        void mutate("deleteCash", { id: c.id }).catch(() => {})
                      }
                    >
                      Remover
                    </button>
                  ),
                ])}
              />
            </Section>
          </>
        ) : (
          <Section
            title="Compromissos"
            description="A baixa cria um lançamento único no caixa"
            actions={
              <button className="tf-primary" onClick={() => addCash(true)}>
                <Plus size={15} /> Novo compromisso
              </button>
            }
          >
            <SimpleTable
              headers={["Vencimento", "Descrição", "Valor", "Situação", ""]}
              rows={data.commitments.map((c) => [
                s(c, "due_on"),
                s(c, "name"),
                brl(n(c, "amount")),
                c.paid_at ? "Pago" : "Pendente",
                <button
                  key="pay"
                  disabled={saving}
                  onClick={() =>
                    void mutate("settle", { id: c.id, paid: !c.paid_at }).catch(
                      () => {},
                    )
                  }
                >
                  {c.paid_at ? "Desfazer baixa" : "Marcar como pago"}
                </button>,
              ])}
            />
          </Section>
        )}
      </>
    );
  else if (mode === "integrations")
    body = (
      <IntegrationWorkspace
        data={data}
        mutate={mutate}
        saving={saving}
        onInfo={openInfo}
        onRefresh={() => refresh(true)}
      />
    );
  else if (mode === "notifications")
    body = <NotificationSettings data={data} mutate={mutate} saving={saving} />;
  else if (mode === "rules")
    body = (
      <Section
        title="Regras de acompanhamento"
        description="Condições avaliadas no servidor, com histórico de notificações"
        actions={
          <div className="tf-actions">
            <button
              disabled={saving}
              onClick={async () => {
                try {
                  await mutate("evaluateRules", {});
                  setNotice("Regras avaliadas. Confira as notificações.");
                } catch {}
              }}
            >
              Avaliar agora
            </button>
            <button
              className="tf-primary"
              onClick={() =>
                openForm(
                  "Nova regra",
                  <>
                    <Field label="Nome">
                      <input name="name" required maxLength={160} />
                    </Field>
                    <Field label="Métrica">
                      <select name="metric">
                        {[
                          ["roi", "ROI"],
                          ["profit", "Lucro"],
                          ["revenue", "Faturamento"],
                          ["sales", "Vendas"],
                          ["untracked", "Não rastreadas"],
                          ["integration_errors", "Falhas de integração"],
                        ].map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Condição">
                      <select name="operator">
                        <option value="lt">Menor que</option>
                        <option value="gt">Maior que</option>
                        <option value="gte">Maior ou igual</option>
                        <option value="lte">Menor ou igual</option>
                      </select>
                    </Field>
                    <Field label="Limite">
                      <input
                        name="threshold"
                        type="number"
                        step="any"
                        required
                      />
                    </Field>
                    <Field label="Janela em dias">
                      <input
                        name="window_days"
                        type="number"
                        min={1}
                        max={30}
                        defaultValue={1}
                        required
                      />
                    </Field>
                  </>,
                  async (f) => {
                    await mutate("rule", {
                      ...Object.fromEntries(f),
                      enabled: true,
                    });
                  },
                )
              }
            >
              + Nova regra
            </button>
          </div>
        }
      >
        <SimpleTable
          headers={["Regra", "Métrica", "Condição", "Janela", ""]}
          rows={data.rules.map((r) => [
            s(r, "name"),
            (
              {
                roi: "ROI",
                profit: "Lucro",
                revenue: "Faturamento",
                sales: "Vendas",
                untracked: "Não rastreadas",
                integration_errors: "Falhas de integração",
              } as Record<string, string>
            )[s(r, "metric")] || s(r, "metric"),
            (
              {
                gt: "Maior que",
                gte: "Maior ou igual a",
                lt: "Menor que",
                lte: "Menor ou igual a",
              } as Record<string, string>
            )[s(r, "operator")] +
              " " +
              s(r, "threshold"),
            s(r, "window_days") + " dias",
            <button
              key="t"
              disabled={saving}
              onClick={() =>
                void mutate("toggleRule", {
                  id: r.id,
                  enabled: !r.enabled,
                }).catch(() => {})
              }
            >
              {r.enabled ? "Pausar" : "Ativar"}
            </button>,
          ])}
        />
      </Section>
    );
  else if (mode === "events")
    body = (
      <Section
        title="Histórico de processamento"
        description="Eventos recebidos pelos checkouts; conteúdo sensível não é exibido"
      >
        <SimpleTable
          headers={["Horário", "Checkout", "Evento", "Status", "Detalhe"]}
          rows={data.webhookEvents
            .filter((e) => {
              const d = dateInZone(s(e, "received_at"), timezone);
              return d >= start && d <= end;
            })
            .slice(0, 200)
            .map((e) => [
              formatDate(s(e, "received_at")),
              s(e, "provider"),
              s(e, "event_type"),
              <Badge
                key="s"
                tone={
                  e.status === "processed"
                    ? "green"
                    : e.status === "error"
                      ? "red"
                      : "default"
                }
              >
                {s(e, "status")}
              </Badge>,
              s(e, "error_message", "—"),
            ])}
        />
        <p className="tf-note">
          Mostrando os 200 eventos mais recentes da dashboard.
        </p>
      </Section>
    );
  else if (mode === "reports")
    body = <Reports data={data} group={group} setGroup={setGroup} />;
  else if (mode === "utms") body = <Utms data={data} onInfo={openInfo} />;
  else if (mode === "settings")
    body = <OfferSettings data={data} mutate={mutate} saving={saving} />;
  else
    body = (
      <>
        {kpis()}
        <Section title="Qualidade do rastreamento">
          <div className="tf-grid-3">
            <div>
              <strong className="tf-big-number">{summary.tracked}</strong>
              <p>Vendas com visita identificada</p>
            </div>
            <div>
              <strong className="tf-big-number">{summary.pending}</strong>
              <p>Origem a confirmar</p>
            </div>
            <div>
              <strong className="tf-big-number">{summary.untracked}</strong>
              <p>Não rastreadas</p>
            </div>
          </div>
        </Section>
        <Section
          title="Pixel e entrega de conversões"
          actions={
            <Link
              className="tf-button"
              href={`/project/${projectId}/integrations?tab=Pixel`}
            >
              Configurar Pixel ↗
            </Link>
          }
        >
          <SimpleTable
            headers={["Evento", "Plataforma", "Entrega", "Tentativas", "Erro"]}
            rows={data.deliveries.map((d) => [
              s(d, "event_id"),
              s(d, "provider"),
              s(d, "status"),
              n(d, "attempts"),
              s(d, "last_error", "—"),
            ])}
          />
        </Section>
        <Section title="Instalação e diagnóstico">
          <p>
            Configure o script da página e valide uma jornada controlada no
            laboratório de Integrações. Vendas rastreadas e conversões entregues
            à mídia são medições diferentes.
          </p>
          <Link
            className="tf-button"
            href={`/project/${projectId}/integrations?tab=Testes`}
          >
            Abrir laboratório ↗
          </Link>
        </Section>
      </>
    );
  return (
    <main className="tf-main">
      <div className="tf-heading">
        <div>
          <small className="tf-eyebrow">{data.project.name}</small>
          <h1>{titles[mode]}</h1>
          <p>Dados da oferta selecionada · {data.project.timezone}</p>
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
            disabled={loading}
            aria-label="Atualizar dados"
            onClick={() => void refresh()}
          >
            <RefreshCw size={17} className={loading ? "tf-spin" : ""} />
          </button>
        </div>
      </div>
      {error && (
        <div className="tf-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="tf-success" role="status">
          {notice}
        </p>
      )}
      {warnings.map((w) => (
        <p className="tf-banner" key={w}>
          {w}
        </p>
      ))}
      {body}
      {modal && (
        <Modal title={modal.title} close={() => setModal(null)}>
          {modal.body}
        </Modal>
      )}
    </main>
  );
}
function ColumnChooser({
  initial,
  onSave,
}: {
  initial: string[];
  onSave: (v: string[]) => Promise<void>;
}) {
  const [columns, setColumns] = useState(initial),
    [search, setSearch] = useState(""),
    [saving, setSaving] = useState(false);
  return (
    <>
      <input
        aria-label="Buscar métrica"
        placeholder="Buscar métrica"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="tf-column-picker">
        <div>
          {Object.entries(columnNames)
            .filter(([, v]) => v.toLowerCase().includes(search.toLowerCase()))
            .map(([k, v]) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={columns.includes(k)}
                  onChange={(e) =>
                    setColumns(
                      e.target.checked
                        ? [...columns, k]
                        : columns.filter((c) => c !== k),
                    )
                  }
                />
                {v}
              </label>
            ))}
        </div>
        <div>
          {columns.map((c, i) => (
            <div key={c} className="tf-column-order">
              <span>{columnNames[c]}</span>
              <button
                aria-label={"Mover " + columnNames[c] + " para cima"}
                disabled={i === 0}
                onClick={() => {
                  const copy = [...columns];
                  [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                  setColumns(copy);
                }}
              >
                ↑
              </button>
              <button
                aria-label={"Mover " + columnNames[c] + " para baixo"}
                disabled={i === columns.length - 1}
                onClick={() => {
                  const copy = [...columns];
                  [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
                  setColumns(copy);
                }}
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      </div>
      <button
        className="tf-primary"
        disabled={saving || !columns.length}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(columns);
          } catch {
          } finally {
            setSaving(false);
          }
        }}
      >
        Aplicar {columns.length} métricas
      </button>
    </>
  );
}
export function downloadCsv(
  name: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const safe = (v: string | number) => {
    const value = String(v);
    return (
      '"' +
      (/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""') +
      '"'
    );
  };
  const csv =
    "\ufeff" +
    [headers, ...rows].map((r) => r.map(safe).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Reports({
  data,
  group,
  setGroup,
}: {
  data: WorkspaceData;
  group: string;
  setGroup: (v: string) => void;
}) {
  const summary = aggregate(data),
    ids = new Set(scopeCampaigns(data).map((c) => c.id));
  const values = new Map<
    string,
    { revenue: number; investment: number; costs: number; sales: number }
  >();
  const row = (key: string) => {
    if (!values.has(key))
      values.set(key, { revenue: 0, investment: 0, costs: 0, sales: 0 });
    return values.get(key)!;
  };
  if (group === "Dia") {
    for (
      let stamp = Date.parse(data.period.start + "T12:00:00Z");
      stamp <= Date.parse(data.period.end + "T12:00:00Z");
      stamp += 86400000
    )
      row(new Date(stamp).toISOString().slice(0, 10));
    for (const o of summary.paid) {
      const r = row(dateInZone(s(o, "paid_at"), data.project.timezone));
      r.sales++;
      if (o.currency === "BRL") r.revenue += n(o, "gross_amount");
    }
    for (const i of data.insights)
      if (i.level === "campaign" && ids.has(s(i, "campaign_id")))
        row(s(i, "metric_date")).investment += n(i, "spend_brl");
    for (const e of data.expenses)
      row(s(e, "occurred_on")).costs += n(e, "amount_brl");
  } else {
    for (const o of summary.paid) {
      const key =
        group === "Checkout"
          ? s(o, "provider")
          : attribution(o) === "untracked"
            ? "Não rastreada"
            : s(o, "utm_source", "Sem origem detalhada");
      const r = row(key);
      r.sales++;
      if (o.currency === "BRL") r.revenue += n(o, "gross_amount");
    }
  }
  const rows = [...values]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, r]) => ({
      name,
      ...r,
      profit: r.revenue - r.investment - r.costs,
      roi:
        r.investment + r.costs > 0
          ? ((r.revenue - r.investment - r.costs) / (r.investment + r.costs)) *
            100
          : null,
    }));
  const headers = [
    "Agrupamento",
    "Vendas",
    "Faturamento",
    ...(group === "Dia" ? ["Investimento", "Despesas", "Lucro", "ROI"] : []),
  ];
  const cells = rows.map((r) => [
    r.name,
    r.sales,
    brl(r.revenue),
    ...(group === "Dia"
      ? [brl(r.investment), brl(r.costs), brl(r.profit), percent(r.roi)]
      : []),
  ]);
  return (
    <Section
      title="Performance detalhada"
      description="Dados reais, agrupamento e exportação do mesmo recorte"
      actions={
        <button
          onClick={() =>
            downloadCsv("traffic-flow-relatorio.csv", headers, cells)
          }
        >
          Exportar CSV
        </button>
      }
    >
      <div className="tf-actions">
        <Field label="Agrupar por">
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            {["Dia", "Checkout", "Origem"].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
      </div>
      <SimpleTable headers={headers} rows={cells} />
      <div className="tf-report-total">
        <span>{summary.sales} vendas · total da dashboard</span>
        <strong className="tf-money">{brl(summary.revenue)}</strong>
      </div>
      {group !== "Dia" && (
        <p className="tf-note">
          Investimentos e custos não são distribuídos entre checkouts/origens
          sem regra de rateio. Consulte o resultado consolidado por dia.
        </p>
      )}
    </Section>
  );
}
function Utms({
  data,
  onInfo,
}: {
  data: WorkspaceData;
  onInfo: (title: string, body: ReactNode) => void;
}) {
  const [url, setUrl] = useState(""),
    [source, setSource] = useState("facebook"),
    [medium, setMedium] = useState("paid"),
    [campaign, setCampaign] = useState(""),
    [generated, setGenerated] = useState(""),
    [error, setError] = useState("");
  const groups = new Map<string, { sales: number; revenue: number }>();
  for (const o of aggregate(data).paid) {
    const key = [
      s(o, "utm_source", "Sem origem"),
      s(o, "utm_medium", "—"),
      s(o, "utm_campaign", "—"),
    ].join(" / ");
    const r = groups.get(key) || { sales: 0, revenue: 0 };
    r.sales++;
    if (o.currency === "BRL") r.revenue += n(o, "gross_amount");
    groups.set(key, r);
  }
  return (
    <>
      <Section
        title="Origens das vendas"
        description="UTMs recebidas nos pedidos da oferta"
      >
        <SimpleTable
          headers={["Source / Medium / Campaign", "Vendas", "Faturamento"]}
          rows={[...groups].map(([k, v]) => [k, v.sales, brl(v.revenue)])}
        />
      </Section>
      <Section title="Criar link com UTMs">
        <form
          className="tf-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const u = new URL(url);
              if (!["https:", "http:"].includes(u.protocol)) throw new Error();
              u.searchParams.set("utm_source", source);
              u.searchParams.set("utm_medium", medium);
              u.searchParams.set("utm_campaign", campaign);
              setGenerated(u.href);
              setError("");
            } catch {
              setError("Informe uma URL válida HTTP ou HTTPS.");
            }
          }}
        >
          <Field label="URL da página">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              type="url"
              required
            />
          </Field>
          <div className="tf-form-grid">
            <Field label="Source">
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              />
            </Field>
            <Field label="Medium">
              <input
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Campaign">
            <input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              required
            />
          </Field>
          <button className="tf-primary">Gerar link</button>
          {error && <p className="tf-error">{error}</p>}
          {generated && (
            <Field label="Link gerado">
              <input
                readOnly
                value={generated}
                onFocus={(e) => e.target.select()}
              />
            </Field>
          )}
          <button
            type="button"
            onClick={() =>
              onInfo(
                "Sobre as UTMs",
                <p>
                  UTMs identificam parâmetros de campanha. O identificador
                  Traffic Flow é transportado pelo script quando instalado;
                  gerar um link UTM não substitui essa instalação.
                </p>,
              )
            }
          >
            Como usar
          </button>
        </form>
      </Section>
    </>
  );
}
function OfferSettings({
  data,
  mutate,
  saving,
}: {
  data: WorkspaceData;
  mutate: Mutate;
  saving: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState(() =>
      strings(data.settings.campaign_ids),
    ),
    [query, setQuery] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await mutate("settings", {
        product_name: f.get("product_name"),
        sales_page_url: f.get("sales_page_url"),
        checkout_url: f.get("checkout_url"),
        goal: Number(f.get("goal")),
        product_ids: String(f.get("product_ids") || "")
          .split(/[\n,]/)
          .map((v) => v.trim())
          .filter(Boolean),
        campaign_ids: selectedIds,
      });
    } catch {}
  }
  return (
    <form className="tf-form" onSubmit={submit}>
      <div className="tf-grid-2">
        <Section
          title="Oferta e páginas"
          description="Cada dashboard acompanha uma oferta separadamente"
        >
          <Field label="Nome do produto/oferta">
            <input
              name="product_name"
              defaultValue={s(data.settings, "product_name", data.project.name)}
              required
              maxLength={160}
            />
          </Field>
          <Field label="Página de vendas">
            <input
              name="sales_page_url"
              type="url"
              defaultValue={s(data.settings, "sales_page_url")}
              placeholder="https://"
            />
          </Field>
          <Field label="Checkout">
            <input
              name="checkout_url"
              type="url"
              defaultValue={s(data.settings, "checkout_url")}
              placeholder="https://"
            />
          </Field>
          <Field label="IDs dos produtos no checkout">
            <textarea
              name="product_ids"
              defaultValue={strings(data.settings.product_ids).join("\n")}
              placeholder="Um ID por linha"
            />
          </Field>
          <p className="tf-note">
            Use os IDs para mapear os produtos desta oferta; cada integração
            também terá seu filtro de produto.
          </p>
        </Section>
        <Section title="Meta e preferências">
          <Field label="Meta de faturamento (BRL)">
            <input
              name="goal"
              type="number"
              min={0}
              step="0.01"
              defaultValue={n(data.settings, "goal")}
            />
          </Field>
          <dl className="tf-details">
            <dt>Dashboard</dt>
            <dd>{data.project.name}</dd>
            <dt>Fuso</dt>
            <dd>{data.project.timezone}</dd>
            <dt>Moeda</dt>
            <dd>{data.project.base_currency}</dd>
          </dl>
          <p className="tf-note">
            O investimento de diferentes moedas só entra no resultado após
            conversão verificável.
          </p>
        </Section>
      </div>
      <Section
        title="Campanhas desta oferta"
        description="Vincule somente as campanhas que pertencem a esta dashboard"
      >
        <input
          aria-label="Buscar campanha para vincular"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar campanha"
        />
        <div className="tf-campaign-checklist">
          {data.campaigns
            .filter((c) =>
              s(c, "name").toLowerCase().includes(query.toLowerCase()),
            )
            .map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={(e) =>
                    setSelectedIds(
                      e.target.checked
                        ? [...selectedIds, c.id]
                        : selectedIds.filter((id) => id !== c.id),
                    )
                  }
                />
                <span>
                  {s(c, "name")}
                  <small>
                    {s(
                      data.accounts.find((a) => a.id === c.ad_account_id) || {},
                      "name",
                    )}{" "}
                    · {s(c, "external_id")}
                  </small>
                </span>
              </label>
            ))}
        </div>
        {!data.campaigns.length && (
          <Empty>
            Conecte uma conta de anúncios e sincronize a estrutura em
            Integrações.
          </Empty>
        )}
      </Section>
      <div className="tf-savebar">
        <span>{selectedIds.length} campanhas selecionadas nesta oferta</span>
        <button className="tf-primary" disabled={saving}>
          Salvar configurações
        </button>
      </div>
    </form>
  );
}
