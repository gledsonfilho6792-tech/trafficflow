export type Row = { id: string; [key: string]: unknown };
export type Project = {
  id: string;
  name: string;
  timezone: string;
  base_currency: string;
};
export type WorkspaceData = {
  project: Project;
  projects: Project[];
  settings: Row;
  preferences: Record<string, unknown>;
  accounts: Row[];
  campaigns: Row[];
  adsets: Row[];
  ads: Row[];
  insights: Row[];
  orders: Row[];
  sessions: Row[];
  events: Row[];
  expenses: Row[];
  integrations: Row[];
  webhookEvents: Row[];
  cash: Row[];
  commitments: Row[];
  rules: Row[];
  notifications: Row[];
  apiKeys: Row[];
  deliveries: Row[];
  period: { start: string; end: string };
  warnings: string[];
};
export const text = (
  row: Record<string, unknown>,
  key: string,
  fallback = "",
) => (row[key] == null ? fallback : String(row[key]));
export const numeric = (row: Record<string, unknown>, key: string) =>
  Number.isFinite(Number(row[key])) ? Number(row[key]) : 0;
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
