import {
  numeric as n,
  text as s,
  strings,
  type Row,
  type WorkspaceData,
} from "./types";
export function dateInZone(value: string, timezone: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)?.value)
    .join("-");
}
export function validDate(v: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v + "T12:00:00Z")) &&
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v
  );
}
export function dateWindow(start: string, end: string) {
  if (
    !validDate(start) ||
    !validDate(end) ||
    start > end ||
    Date.parse(end) - Date.parse(start) > 366 * 86400000
  )
    throw new Error("Selecione um período válido de até 367 dias.");
}
export function attribution(order: Row) {
  return order.tracking_session_id
    ? "tracked"
    : order.attribution_token || order.attribution_method === "token_pending"
      ? "pending"
      : "untracked";
}
export function ratio(a: number, b: number) {
  return b > 0 ? a / b : null;
}
export function scopeCampaigns(data: WorkspaceData) {
  const ids = strings(data.settings.campaign_ids);
  return data.campaigns.filter((c) => ids.includes(c.id));
}
export function aggregate(
  data: WorkspaceData,
  account = "all",
  level = "campaign",
  parent = "",
) {
  const campaignIds = new Set(scopeCampaigns(data).map((c) => c.id));
  const entities = (
    level === "adset" ? data.adsets : level === "ad" ? data.ads : data.campaigns
  ).filter(
    (c) =>
      campaignIds.has(level === "campaign" ? c.id : s(c, "campaign_id")) &&
      (account === "all" || c.ad_account_id === account) &&
      (!parent || c.campaign_id === parent || c.ad_set_id === parent),
  );
  const timezone = data.project.timezone;
  const inPeriod = (date: string) => {
    const d = dateInZone(date, timezone);
    return d >= data.period.start && d <= data.period.end;
  };
  const paid = data.orders.filter(
    (o) => o.status === "paid" && inPeriod(s(o, "paid_at")),
  );
  const sessions = new Map(data.sessions.map((r) => [r.id, r]));
  const revenue = (orders: Row[]) =>
    orders
      .filter((o) => s(o, "currency") === "BRL")
      .reduce((v, o) => v + n(o, "gross_amount"), 0);
  const mediaInPeriod = (r: Row) =>
    !r.metric_date ||
    (s(r, "metric_date") >= data.period.start &&
      s(r, "metric_date") <= data.period.end);
  const scopedInsights = data.insights.filter(
    (r) =>
      mediaInPeriod(r) &&
      r.level === level &&
      campaignIds.has(s(r, "campaign_id")) &&
      (account === "all" || r.ad_account_id === account),
  );
  const rows = entities.map((entity) => {
    const key =
      level === "campaign"
        ? "campaign_id"
        : level === "adset"
          ? "ad_set_id"
          : "ad_id";
    const media = scopedInsights.filter((r) => r[key] === entity.id);
    const sales = paid.filter(
      (o) => sessions.get(s(o, "tracking_session_id"))?.[key] === entity.id,
    );
    const spend = media.reduce((v, r) => v + n(r, "spend_brl"), 0);
    const rev = revenue(sales);
    const clicks = media.reduce((v, r) => v + n(r, "clicks"), 0),
      impressions = media.reduce((v, r) => v + n(r, "impressions"), 0);
    const ownSessions = new Set(
      data.sessions.filter((v) => v[key] === entity.id).map((v) => v.id),
    );
    const events = data.events.filter(
      (e) =>
        ownSessions.has(s(e, "tracking_session_id")) &&
        inPeriod(s(e, "occurred_at")),
    );
    const pageviews = events.filter((e) => e.event_name === "page_view").length;
    const observedIc = events.filter(
      (e) => e.event_name === "checkout_started",
    ).length;
    const linkCheckouts = events.filter(
      (e) => e.event_name === "initiate_checkout",
    ).length;
    const started = data.orders.filter(
      (o) =>
        ownSessions.has(s(o, "tracking_session_id")) &&
        inPeriod(s(o, "provider_created_at", s(o, "created_at"))),
    );
    const profit = rev - spend;
    return {
      ...entity,
      investment: spend,
      revenue: rev,
      sales: sales.length,
      profit,
      roi: ratio(profit * 100, spend),
      margin: ratio(profit * 100, rev),
      pageviews,
      ic: observedIc || null,
      checkout_clicks: linkCheckouts,
      started: started.length,
      pending_sales: started.filter((o) => o.status === "pending").length,
      refunded: started.filter((o) => o.status === "refunded").length,
      chargebacks: started.filter((o) => o.status === "chargeback").length,
      arpu: ratio(rev, new Set(sales.map((o) => o.tracking_session_id)).size),
      cpv: ratio(spend, pageviews),
      cpi: observedIc ? ratio(spend, observedIc) : null,
      connection: ratio(pageviews * 100, clicks),
      icr: observedIc ? ratio(observedIc * 100, pageviews) : null,
      conversion: ratio(sales.length * 100, pageviews),
      checkout_conversion: observedIc
        ? ratio(sales.length * 100, observedIc)
        : null,

      clicks,
      impressions,
      roas: ratio(rev, spend),
      cpa: ratio(spend, sales.length),
      cpc: ratio(spend, clicks),
      cpm: ratio(spend * 1000, impressions),
      ctr: ratio(clicks * 100, impressions),
      missingFx: media.filter((r) => r.spend_brl == null).length,
    };
  });
  const investment = data.insights
    .filter(
      (r) =>
        mediaInPeriod(r) &&
        r.level === "campaign" &&
        campaignIds.has(s(r, "campaign_id")) &&
        (account === "all" || r.ad_account_id === account),
    )
    .reduce((v, r) => v + n(r, "spend_brl"), 0);
  const costs = data.expenses.reduce((v, r) => v + n(r, "amount_brl"), 0),
    rev = revenue(paid),
    profit = rev - investment - costs;
  const attributedPaid = paid.filter((o) =>
    campaignIds.has(
      s(sessions.get(s(o, "tracking_session_id")) || {}, "campaign_id"),
    ),
  );
  return {
    rows,
    paid,
    investment,
    costs,
    revenue: rev,
    profit,
    roi: ratio(profit * 100, investment + costs),
    margin: ratio(profit * 100, rev),
    roas: ratio(revenue(attributedPaid), investment),
    sales: paid.length,
    tracked: paid.filter((o) => attribution(o) === "tracked").length,
    pending: paid.filter((o) => attribution(o) === "pending").length,
    untracked: paid.filter((o) => attribution(o) === "untracked").length,
    foreignCurrency: paid.filter((o) => s(o, "currency") !== "BRL").length,
  };
}
